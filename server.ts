import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { EstadoJogo, ClasseNome, MensagemChat } from './types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const statusBase: Record<ClasseNome, { hp: number; bonusDano: number; mana: number; cor: string }> = {
  'Guerreiro': { hp: 250, bonusDano: 10, mana: 50, cor: '#3b82f6' },
  'Mago': { hp: 120, bonusDano: 20, mana: 150, cor: '#a855f7' },
  'Arqueiro': { hp: 160, bonusDano: 15, mana: 80, cor: '#10b981' }
};

let estado: EstadoJogo = {
  jogadores: {},
  monstro: { nome: "Guardião da Floresta", hp: 400, maxHp: 400, ataque: 35, nivel: 1 },
  turno: 'SQUAD'
};

const rolarD20 = () => Math.floor(Math.random() * 20) + 1;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: '/api/socket' });

  io.on('connection', (socket) => {
    socket.emit('atualizar', estado);

    socket.on('entrar', (dados: { nome: string, classe: ClasseNome }) => {
      const config = statusBase[dados.classe];
      estado.jogadores[socket.id] = {
        id: socket.id, nome: dados.nome, classe: dados.classe,
        hp: config.hp, maxHp: config.hp, mana: config.mana, maxMana: config.mana,
        ataque: config.bonusDano, nivel: 1, xp: 0, foiSuaVez: false, estaDefendendo: false
      };
      io.emit('atualizar', estado);
    });

    socket.on('enviarMensagem', (texto: string) => {
      const p = estado.jogadores[socket.id];
      if (p) io.emit('receberMensagem', { id: Date.now().toString(), autor: p.nome, texto, cor: statusBase[p.classe].cor });
    });

    socket.on('usarHabilidade', (tipo: string) => {
      const p = estado.jogadores[socket.id];
      if (estado.turno !== 'SQUAD' || !p || p.foiSuaVez || p.hp <= 0) return;

      let danoFinal = 0;
      let custo = 0;
      const dado = rolarD20();

      if (tipo === 'defender') {
        p.estaDefendendo = true;
        p.foiSuaVez = true;
      } else {
        p.estaDefendendo = false;
        if (tipo === 'basico') danoFinal = dado + p.ataque;
        else if (tipo === 'especial') { custo = 30; danoFinal = (dado * 2) + p.ataque; }

        if (p.mana >= custo) {
          p.mana -= custo;
          if (dado === 20) danoFinal *= 2;
          estado.monstro.hp = Math.max(0, estado.monstro.hp - danoFinal);
          p.foiSuaVez = true;
          io.emit('efeitoDano', { valor: danoFinal, critico: dado === 20, alvo: 'monstro' });
        }
      }
      if (estado.monstro.hp <= 0) processarVitoria(io);
      else verificarFimTurno(io);
    });

    socket.on('disconnect', () => { delete estado.jogadores[socket.id]; io.emit('atualizar', estado); });
  });

  httpServer.listen(3000);
});

function verificarFimTurno(io: Server) {
  if (Object.values(estado.jogadores).filter(j => j.hp > 0).every(j => j.foiSuaVez)) {
    estado.turno = 'MONSTRO';
    io.emit('atualizar', estado);
    setTimeout(() => turnoDoMonstro(io), 1500);
  } else { io.emit('atualizar', estado); }
}

function turnoDoMonstro(io: Server) {
  const vivos = Object.values(estado.jogadores).filter(p => p.hp > 0);
  if (vivos.length > 0) {
    const alvo = vivos[Math.floor(Math.random() * vivos.length)];
    let dano = estado.monstro.ataque;
    if (alvo.estaDefendendo) dano = Math.floor(dano * 0.5);
    alvo.hp = Math.max(0, alvo.hp - dano);
    io.emit('efeitoDano', { valor: dano, critico: false, alvo: 'player', idAlvo: alvo.id });
  }
  Object.values(estado.jogadores).forEach(p => { p.foiSuaVez = false; p.estaDefendendo = false; p.mana = Math.min(p.maxMana, p.mana + 15); });
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}

function processarVitoria(io: Server) {
  estado.monstro.nivel++;
  const nv = estado.monstro.nivel;
  Object.values(estado.jogadores).forEach(p => { 
      p.xp += 50; 
      if(p.xp >= 100){ p.nivel++; p.xp = 0; p.maxHp += 30; p.hp = p.maxHp; p.ataque += 5; }
      p.foiSuaVez = false; 
  });

  // Nomes temáticos baseados no Mapa
  const nomes = ["Lobo Vil", "Orc de Sangue", "Espectro de Gelo", "Golems Cósmico"];
  const nomeIndex = Math.floor((nv - 1) / 2) % nomes.length;

  estado.monstro = {
    nome: nomes[nomeIndex],
    maxHp: 400 + (nv * 200), hp: 400 + (nv * 200),
    ataque: 35 + (nv * 15), nivel: nv
  };
  estado.turno = 'SQUAD';
  io.emit('atualizar', estado);
}