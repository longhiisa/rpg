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
    socket.on('entrar', (dados: { nome: string, classe: ClasseNome }) => {
      const config = statusBase[dados.classe];
      estado.jogadores[socket.id] = {
        id: socket.id, nome: dados.nome, classe: dados.classe,
        hp: config.hp, maxHp: config.hp, mana: config.mana, maxMana: config.mana,
        ataque: config.ataque, nivel: 1, xp: 0, foiSuaVez: false
      };
      io.emit('atualizar', estado);
    });

    socket.on('usarHabilidade', (tipo: string) => {
      const p = estado.jogadores[socket.id];
      if (estado.turno !== 'SQUAD' || !p || p.foiSuaVez || p.hp <= 0) return;

      let dano = 0;
      let custo = 0;
      let msg = "";

      if (tipo === 'basico') {
        dano = p.ataque;
        msg = `${p.nome} atacou!`;
      } else if (p.classe === 'Guerreiro') {
        if (tipo === 'golpe') { 
            custo = 20; dano = p.ataque * 2; msg = `${p.nome} usou Golpe Pesado!`; 
        }
      } else if (p.classe === 'Mago') {
        if (tipo === 'missil') { 
            custo = 30; dano = 60; msg = `${p.nome} lançou Míssil Mágico!`; 
        } else if (tipo === 'explosao') { 
            custo = 80; dano = 120; msg = `${p.nome} usou EXPLOSÃO ARCANA!`; 
        }
      } else if (p.classe === 'Arqueiro') {
        if (tipo === 'preciso') { 
            custo = 25; dano = p.ataque + 50; msg = `${p.nome} deu um Tiro Preciso!`; 
        }
      }

      if (p.mana >= custo) {
        p.mana -= custo;
        estado.monstro.hp -= dano;
        p.foiSuaVez = true;
        io.emit('notificacao', msg);
        
        verificarFimTurno(io);
      }
    });

    socket.on('disconnect', () => {
      delete estado.jogadores[socket.id];
      io.emit('atualizar', estado);
    });
  });

  httpServer.listen(3000, () => console.log(`> Servidor Online`));
});

function verificarFimTurno(io: Server) {
  const vivos = Object.values(estado.jogadores).filter(j => j.hp > 0);
  if (estado.monstro.hp <= 0) {
    processarVitoria(io);
  } else if (vivos.every(j => j.foiSuaVez)) {
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
    io.emit('notificacao', `O monstro causou ${estado.monstro.ataque} de dano em ${alvo.nome}!`);
  }
  Object.values(estado.jogadores).forEach(p => {
      p.foiSuaVez = false;
      p.mana = Math.min(p.maxMana, p.mana + 15); // Recupera mana por turno
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
        p.nivel++; p.xp = 0; p.maxHp += 30; p.hp = p.maxHp; 
        p.maxMana += 20; p.mana = p.maxMana; p.ataque += 8; 
    }
    p.foiSuaVez = false;
  });
  estado.monstro = {
    nome: `Chefe Nível ${nv}`,
    maxHp: 600 + (nv * 150), hp: 600 + (nv * 150),
    ataque: 45 + (nv * 12), nivel: nv
  };
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}