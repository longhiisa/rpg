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
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    path: '/api/socket', // CAMINHO ESPECÍFICO
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Jogador conectado: ${socket.id}`);

    socket.on('entrar', (dados: { nome: string, classe: ClasseNome }) => {
      if (Object.keys(estado.jogadores).length >= 4) return;
      const config = statusBase[dados.classe];
      estado.jogadores[socket.id] = {
        id: socket.id,
        nome: dados.nome,
        classe: dados.classe,
        hp: config.hp,
        maxHp: config.hp,
        ataque: config.ataque,
        nivel: 1,
        xp: 0,
        foiSuaVez: false
      };
      io.emit('atualizar', estado);
    });

    socket.on('atacar', () => {
      const player = estado.jogadores[socket.id];
      if (estado.turno === 'SQUAD' && player && !player.foiSuaVez && player.hp > 0) {
        estado.monstro.hp -= player.ataque;
        player.foiSuaVez = true;
        if (estado.monstro.hp <= 0) {
          processarVitoria(io);
        } else {
          const jogadoresVivos = Object.values(estado.jogadores).filter(p => p.hp > 0);
          if (jogadoresVivos.every(p => p.foiSuaVez)) {
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
      delete estado.jogadores[socket.id];
      io.emit('atualizar', estado);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Servidor Online na porta ${PORT}`);
  });
});

function turnoDoMonstro(io: Server) {
  const jogadoresVivos = Object.values(estado.jogadores).filter(p => p.hp > 0);
  if (jogadoresVivos.length > 0) {
    const alvo = jogadoresVivos[Math.floor(Math.random() * jogadoresVivos.length)];
    alvo.hp -= estado.monstro.ataque;
    if (alvo.hp < 0) alvo.hp = 0;
    io.emit('notificacao', `${estado.monstro.nome} atacou ${alvo.nome}!`);
  }
  Object.values(estado.jogadores).forEach(p => p.foiSuaVez = false);
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}

function processarVitoria(io: Server) {
  estado.monstro.nivel += 1;
  const nv = estado.monstro.nivel;
  Object.values(estado.jogadores).forEach(p => {
    p.xp += 50;
    if (p.xp >= 100) { p.nivel++; p.xp = 0; p.maxHp += 25; p.hp = p.maxHp; p.ataque += 10; }
    p.foiSuaVez = false;
  });
  estado.monstro = {
    nome: `Monstro Nível ${nv}`,
    maxHp: 500 + (nv * 100), hp: 500 + (nv * 100),
    ataque: 40 + (nv * 10), nivel: nv
  };
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
  io.emit('notificacao', 'Vitória! O Squad subiu de nível.');
}