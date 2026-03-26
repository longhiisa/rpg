// server.ts
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { EstadoJogo, ClasseNome, Jogador } from './types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Configurações iniciais das classes
const statusBase: Record<ClasseNome, { hp: number; ataque: number }> = {
  'Guerreiro': { hp: 200, ataque: 30 },
  'Mago': { hp: 100, ataque: 60 },
  'Arqueiro': { hp: 130, ataque: 45 }
};

// Estado inicial do jogo (Memória volátil - reseta no Railway se o servidor reiniciar)
let estado: EstadoJogo = {
  jogadores: {},
  monstro: { 
    nome: "Dragão de Ferro", 
    hp: 500, 
    maxHp: 500, 
    ataque: 40,
    nivel: 1 
  },
  turno: 'SQUAD'
};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log(`Jogador conectado: ${socket.id}`);

    // --- AÇÃO: ENTRAR NO JOGO ---
    socket.on('entrar', (dados: { nome: string, classe: ClasseNome }) => {
      // Regra: Máximo 4 jogadores
      if (Object.keys(estado.jogadores).length >= 4) {
        socket.emit('erro', 'O squad já está cheio (máx 4 jogadores).');
        return;
      }

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

    // --- AÇÃO: ATACAR ---
    socket.on('atacar', () => {
      const player = estado.jogadores[socket.id];
      
      // Validações: É a vez do squad? O jogador existe? Ele já atacou?
      if (estado.turno === 'SQUAD' && player && !player.foiSuaVez && player.hp > 0) {
        
        // Aplica dano no monstro
        estado.monstro.hp -= player.ataque;
        player.foiSuaVez = true;

        // Verifica se o monstro morreu
        if (estado.monstro.hp <= 0) {
          processarVitoria(io);
        } else {
          // Verifica se todos os jogadores vivos já atacaram
          const jogadoresVivos = Object.values(estado.jogadores).filter(p => p.hp > 0);
          const todosAtacaram = jogadoresVivos.every(p => p.foiSuaVez);

          if (todosAtacaram) {
            estado.turno = 'MONSTRO';
            io.emit('atualizar', estado);
            
            // Delay para o monstro atacar (experiência de jogo melhor)
            setTimeout(() => turnoDoMonstro(io), 1500);
          } else {
            io.emit('atualizar', estado);
          }
        }
      }
    });

    // --- AÇÃO: DESCONECTAR ---
    socket.on('disconnect', () => {
      delete estado.jogadores[socket.id];
      // Se não houver mais jogadores, opcionalmente resetar o monstro
      if (Object.keys(estado.jogadores).length === 0) {
        estado.monstro = { nome: "Dragão de Ferro", hp: 500, maxHp: 500, ataque: 40, nivel: 1 };
      }
      io.emit('atualizar', estado);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Servidor Online na porta ${PORT}`);
  });
});

// --- LÓGICA: TURNO DO MONSTRO ---
function turnoDoMonstro(io: Server) {
  const jogadoresVivos = Object.values(estado.jogadores).filter(p => p.hp > 0);
  
  if (jogadoresVivos.length > 0) {
    // Escolhe um alvo aleatório do squad
    const alvo = jogadoresVivos[Math.floor(Math.random() * jogadoresVivos.length)];
    alvo.hp -= estado.monstro.ataque;
    
    if (alvo.hp < 0) alvo.hp = 0;
  }
  
  // Reseta os turnos dos jogadores e volta para o Squad
  Object.values(estado.jogadores).forEach(p => p.foiSuaVez = false);
  estado.turno = 'SQUAD';
  
  io.emit('atualizar', estado);
}

// --- LÓGICA: VITÓRIA E LEVEL UP ---
function processarVitoria(io: Server) {
  estado.monstro.nivel += 1;
  const novoNivelMonstro = estado.monstro.nivel;

  // Jogadores ganham XP e sobem de nível
  Object.values(estado.jogadores).forEach(p => {
    p.xp += 50; // Ganha 50 de XP por monstro

    if (p.xp >= 100) {
      p.nivel += 1;
      p.xp = 0;
      // Bonus por subir de nível
      p.maxHp += 25;
      p.hp = p.maxHp; // Cura ao subir de nível
      p.ataque += 10;
    }
    p.foiSuaVez = false; // Reseta turno para a próxima luta
  });

  // Respawn de um monstro mais forte
  estado.monstro = {
    nome: `Monstro Elite Nível ${novoNivelMonstro}`,
    maxHp: 500 + (novoNivelMonstro * 100),
    hp: 500 + (novoNivelMonstro * 100),
    ataque: 40 + (novoNivelMonstro * 10),
    nivel: novoNivelMonstro
  };

  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
  io.emit('notificacao', 'O Monstro foi derrotado! O Squad subiu de nível.');
}