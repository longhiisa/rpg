// server.ts
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { EstadoJogo, ClasseNome } from './types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const statusBase: Record<ClasseNome, { hp: number; ataque: number; mana: number }> = {
  'Guerreiro': { hp: 250, ataque: 25, mana: 50 },
  'Mago': { hp: 120, ataque: 15, mana: 150 },
  'Arqueiro': { hp: 160, ataque: 35, mana: 80 }
};

let estado: EstadoJogo = {
  jogadores: {},
  monstro: { nome: "Dragão de Ferro", hp: 600, maxHp: 600, ataque: 45, nivel: 1 },
  turno: 'SQUAD'
};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  
  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on('connection', (socket) => {
    console.log(`Conectado: ${socket.id}`);
    socket.emit('atualizar', estado);

    socket.on('entrar', (dados: { nome: string, classe: ClasseNome }) => {
      const config = statusBase[dados.classe];
      estado.jogadores[socket.id] = {
        id: socket.id, nome: dados.nome, classe: dados.classe,
        hp: config.hp, maxHp: config.hp, 
        mana: config.mana, maxMana: config.mana, // CAMPOS ESSENCIAIS
        ataque: config.ataque, nivel: 1, xp: 0, foiSuaVez: false
      };
      io.emit('atualizar', estado);
      io.emit('notificacao', `${dados.nome} entrou na arena!`);
    });

    socket.on('usarHabilidade', (tipo: string) => {
      const p = estado.jogadores[socket.id];
      if (estado.turno !== 'SQUAD' || !p || p.foiSuaVez || p.hp <= 0) return;

      let dano = 0;
      let custo = 0;
      let msg = "";

      if (tipo === 'basico') {
        dano = p.ataque;
        msg = `${p.nome} deu um golpe básico!`;
      } else if (p.classe === 'Guerreiro' && tipo === 'golpe') {
        custo = 20; dano = p.ataque * 2.5; msg = `🔨 ${p.nome} usou GOLPE PESADO!`;
      } else if (p.classe === 'Mago') {
        if (tipo === 'missil') { custo = 30; dano = 70; msg = `🔮 ${p.nome} lançou Míssil Mágico!`; }
        else if (tipo === 'explosao') { custo = 80; dano = 150; msg = `💥 ${p.nome} USOU EXPLOSÃO ARCANA!`; }
      } else if (p.classe === 'Arqueiro' && tipo === 'preciso') {
        custo = 25; dano = p.ataque + 60; msg = `🎯 ${p.nome} deu um TIRO PRECISO!`;
      }

      if (p.mana >= custo) {
        p.mana -= custo;
        estado.monstro.hp = Math.max(0, estado.monstro.hp - dano);
        p.foiSuaVez = true;
        io.emit('notificacao', msg);
        
        if (estado.monstro.hp <= 0) {
          processarVitoria(io);
        } else {
          verificarFimTurno(io);
        }
      }
    });

    socket.on('disconnect', () => {
      delete estado.jogadores[socket.id];
      io.emit('atualizar', estado);
    });
  });

  httpServer.listen(3000, () => console.log(`> Servidor Online na 3000`));
});

function verificarFimTurno(io: Server) {
  const vivos = Object.values(estado.jogadores).filter(j => j.hp > 0);
  const todosJogaram = vivos.every(j => j.foiSuaVez);

  if (todosJogaram && vivos.length > 0) {
    estado.turno = 'MONSTRO';
    io.emit('atualizar', estado);
    setTimeout(() => turnoDoMonstro(io), 1500);
  } else {
    io.emit('atualizar', estado);
  }
}

function turnoDoMonstro(io: Server) {
  const vivos = Object.values(estado.jogadores).filter(p => p.hp > 0);
  if (vivos.length > 0) {
    const alvo = vivos[Math.floor(Math.random() * vivos.length)];
    alvo.hp = Math.max(0, alvo.hp - estado.monstro.ataque);
    io.emit('notificacao', `👹 O monstro atacou ${alvo.nome}!`);
  }
  
  // Reset de turno e recuperação de Mana
  Object.values(estado.jogadores).forEach(p => {
    p.foiSuaVez = false;
    p.mana = Math.min(p.maxMana, p.mana + 20); 
  });
  
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}

function processarVitoria(io: Server) {
  estado.monstro.nivel++;
  const nv = estado.monstro.nivel;
  Object.values(estado.jogadores).forEach(p => {
    p.xp += 50;
    if (p.xp >= 100) {
      p.nivel++; p.xp = 0; p.maxHp += 40; p.hp = p.maxHp;
      p.maxMana += 30; p.mana = p.maxMana; p.ataque += 12;
    }
    p.foiSuaVez = false;
  });
  estado.monstro = {
    nome: nv % 5 === 0 ? "REI DEMÔNIO" : `Monstro Lvl ${nv}`,
    maxHp: 600 + (nv * 200), hp: 600 + (nv * 200),
    ataque: 45 + (nv * 15), nivel: nv
  };
  estado.turno = 'SQUAD';
  io.emit('notificacao', "🏆 VITÓRIA! O monstro caiu!");
  io.emit('atualizar', estado);
}