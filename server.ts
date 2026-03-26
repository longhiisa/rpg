import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { EstadoJogo, ClasseNome, MensagemChat } from './types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const statusBase: Record<ClasseNome, { hp: number; ataque: number; mana: number; cor: string }> = {
  'Guerreiro': { hp: 250, ataque: 25, mana: 50, cor: '#3b82f6' },
  'Mago': { hp: 120, ataque: 15, mana: 150, cor: '#a855f7' },
  'Arqueiro': { hp: 160, ataque: 35, mana: 80, cor: '#10b981' }
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
    socket.emit('atualizar', estado);

    socket.on('entrar', (dados: { nome: string, classe: ClasseNome }) => {
      const config = statusBase[dados.classe];
      estado.jogadores[socket.id] = {
        id: socket.id, nome: dados.nome, classe: dados.classe,
        hp: config.hp, maxHp: config.hp, mana: config.mana, maxMana: config.mana,
        ataque: config.ataque, nivel: 1, xp: 0, foiSuaVez: false
      };
      io.emit('atualizar', estado);
      io.emit('receberMensagem', {
        id: Math.random().toString(),
        autor: "SISTEMA",
        texto: `${dados.nome} entrou na dungeon!`,
        cor: "#f97316"
      });
    });

    socket.on('enviarMensagem', (texto: string) => {
      const p = estado.jogadores[socket.id];
      if (p && texto.trim()) {
        const msg: MensagemChat = {
          id: Date.now().toString(),
          autor: p.nome,
          texto: texto.substring(0, 100),
          cor: statusBase[p.classe].cor
        };
        io.emit('receberMensagem', msg);
      }
    });

    socket.on('usarHabilidade', (tipo: string) => {
      const p = estado.jogadores[socket.id];
      if (estado.turno !== 'SQUAD' || !p || p.foiSuaVez || p.hp <= 0) return;

      let danoBase = 0;
      let custo = 0;
      let msgSom = "";

      if (tipo === 'basico') {
        danoBase = p.ataque;
        msgSom = `${p.nome} atacou!`;
      } else if (p.classe === 'Guerreiro' && tipo === 'golpe') {
        custo = 20; danoBase = p.ataque * 2.5; msgSom = `🔨 Golpe de ${p.nome}!`;
      } else if (p.classe === 'Mago') {
        if (tipo === 'missil') { custo = 30; danoBase = 80; msgSom = `🔮 Míssil de ${p.nome}!`; }
        else if (tipo === 'explosao') { custo = 80; danoBase = 160; msgSom = `💥 EXPLOSÃO de ${p.nome}!`; }
      } else if (p.classe === 'Arqueiro' && tipo === 'preciso') {
        custo = 25; danoBase = p.ataque + 70; msgSom = `🎯 Tiro de ${p.nome}!`;
      }

      if (p.mana >= custo) {
        const isCritico = Math.random() < (p.classe === 'Arqueiro' ? 0.25 : 0.12);
        const danoFinal = Math.floor(isCritico ? danoBase * 2 : danoBase);

        p.mana -= custo;
        estado.monstro.hp = Math.max(0, estado.monstro.hp - danoFinal);
        p.foiSuaVez = true;

        io.emit('efeitoDano', { valor: danoFinal, critico: isCritico, alvo: 'monstro' });
        
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

  httpServer.listen(3000, () => console.log(`> Servidor Online`));
});

function verificarFimTurno(io: Server) {
  const vivos = Object.values(estado.jogadores).filter(j => j.hp > 0);
  if (vivos.every(j => j.foiSuaVez)) {
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
    const danoMonstro = estado.monstro.ataque;
    alvo.hp = Math.max(0, alvo.hp - danoMonstro);
    io.emit('efeitoDano', { valor: danoMonstro, critico: false, alvo: 'player', idAlvo: alvo.id });
  }
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
    nome: `Monstro Lvl ${nv}`,
    maxHp: 600 + (nv * 200), hp: 600 + (nv * 200),
    ataque: 45 + (nv * 15), nivel: nv
  };
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}