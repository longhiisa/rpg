// server.ts
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { EstadoJogo, ClasseNome } from './types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const statusBase: Record<ClasseNome, { hp: number; ataque: number }> = {
  'Guerreiro': { hp: 200, ataque: 30 },
  'Mago': { hp: 100, ataque: 60 },
  'Arqueiro': { hp: 130, ataque: 45 }
};

let estado: EstadoJogo = {
  jogadores: {},
  monstro: { nome: "Dragão de Ferro", hp: 500, maxHp: 500, ataque: 40, nivel: 1 },
  turno: 'SQUAD'
};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Log para debug: ver se as requisições do socket estão chegando
    if (req.url?.includes('socket')) {
      console.log(`Requisição de socket recebida: ${req.url}`);
    }
    handle(req, res);
  });

  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: true, // Reflete a origem da requisição
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'] // Garante compatibilidade
  });

  io.on('connection', (socket) => {
    console.log(`✅ Jogador conectado: ${socket.id}`);
    socket.emit('atualizar', estado);

    socket.on('entrar', (dados: { nome: string, classe: ClasseNome }) => {
      const config = statusBase[dados.classe];
      estado.jogadores[socket.id] = {
        id: socket.id, nome: dados.nome, classe: dados.classe,
        hp: config.hp, maxHp: config.hp, ataque: config.ataque,
        nivel: 1, xp: 0, foiSuaVez: false
      };
      io.emit('atualizar', estado);
    });

    socket.on('atacar', () => {
      const p = estado.jogadores[socket.id];
      if (estado.turno === 'SQUAD' && p && !p.foiSuaVez && p.hp > 0) {
        estado.monstro.hp -= p.ataque;
        p.foiSuaVez = true;
        if (estado.monstro.hp <= 0) {
          processarVitoria(io);
        } else {
          const vivos = Object.values(estado.jogadores).filter(j => j.hp > 0);
          if (vivos.every(j => j.foiSuaVez)) {
            estado.turno = 'MONSTRO';
            io.emit('atualizar', estado);
            setTimeout(() => turnoDoMonstro(io), 1500);
          } else {
            io.emit('atualizar', estado);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Jogador saiu: ${socket.id}`);
      delete estado.jogadores[socket.id];
      io.emit('atualizar', estado);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 SERVIDOR ONLINE NA PORTA ${PORT}`);
    console.log(`🔗 Local: http://localhost:${PORT}\n`);
  });
});

function turnoDoMonstro(io: Server) {
  const vivos = Object.values(estado.jogadores).filter(p => p.hp > 0);
  if (vivos.length > 0) {
    const alvo = vivos[Math.floor(Math.random() * vivos.length)];
    alvo.hp = Math.max(0, alvo.hp - estado.monstro.ataque);
    io.emit('notificacao', `O monstro atacou ${alvo.nome}!`);
  }
  Object.values(estado.jogadores).forEach(p => p.foiSuaVez = false);
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}

function processarVitoria(io: Server) {
  estado.monstro.nivel++;
  const nv = estado.monstro.nivel;
  Object.values(estado.jogadores).forEach(p => {
    p.xp += 50;
    if (p.xp >= 100) { p.nivel++; p.xp = 0; p.maxHp += 20; p.hp = p.maxHp; p.ataque += 10; }
    p.foiSuaVez = false;
  });
  estado.monstro = {
    nome: `Monstro Nível ${nv}`,
    maxHp: 500 + (nv * 80), hp: 500 + (nv * 80),
    ataque: 40 + (nv * 8), nivel: nv
  };
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}