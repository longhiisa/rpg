import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { EstadoJogo, Item } from './types'; // Certifique-se de importar os tipos corretos

console.log("🚀 [1/4] Iniciando script do servidor...");

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// ESTADO GLOBAL IN-MEMORY
let estado: EstadoJogo = {
  jogadores: {},
  monstro: { nome: "Guardião da Floresta", hp: 400, maxHp: 400, ataque: 35, nivel: 1 },
  turno: 'SQUAD',
  moedas: 0 // Começa zerado
};

const statusBase: any = {
  'Guerreiro': { hp: 250, bonusDano: 15, defesa: 5, mana: 60, cor: '#3b82f6', habilidade: 'Golpe Brutal' },
  'Mago': { hp: 120, bonusDano: 25, defesa: 0, mana: 150, cor: '#a855f7', habilidade: 'Explosão Arcana' },
  'Arqueiro': { hp: 160, bonusDano: 20, defesa: 2, mana: 90, cor: '#10b981', habilidade: 'Tiro de Elite' }
};

app.prepare().then(() => {
  console.log("✅ [2/4] Next.js preparado!");
  
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: '/api/socket' });

  io.on('connection', (socket) => {
    socket.emit('atualizar', estado);

    socket.on('entrar', (dados: any) => {
      const config = statusBase[dados.classe];
      estado.jogadores[socket.id] = {
        id: socket.id, nome: dados.nome, classe: dados.classe,
        hp: config.hp, maxHp: config.hp, mana: config.mana, maxMana: config.mana,
        ataque: config.bonusDano, defesa: config.defesa, nivel: 1, xp: 0, 
        foiSuaVez: false, estaDefendendo: false, inventario: [] // Inicia vazio
      };
      io.emit('atualizar', estado);
    });

    socket.on('enviarMensagem', (texto: string) => {
      const p = estado.jogadores[socket.id];
      if (p) io.emit('receberMensagem', { id: Date.now().toString(), autor: p.nome, texto, cor: statusBase[p.classe].cor });
    });

    // --- NOVA FUNÇÃO: COMPRAR ITEM ---
    socket.on('comprarItem', (item: Item) => {
      const p = estado.jogadores[socket.id];
      if (p && estado.moedas >= item.preco) {
        estado.moedas -= item.preco;
        p.inventario.push(item);
        
        // Aplica o bônus no status base do jogador
        if (item.tipo === 'ataque') p.ataque += item.valor;
        if (item.tipo === 'defesa') p.defesa += item.valor;
        if (item.tipo === 'vida') { p.maxHp += item.valor; p.hp += item.valor; }

        io.emit('receberMensagem', { id: Math.random().toString(), autor: "LOJA", texto: `🛍️ ${p.nome} comprou ${item.nome}!`, cor: "#facc15" });
        io.emit('atualizar', estado);
      }
    });

    socket.on('usarHabilidade', (tipo: string) => {
      const p = estado.jogadores[socket.id];
      if (estado.turno !== 'SQUAD' || !p || p.foiSuaVez || p.hp <= 0) return;

      const dado = Math.floor(Math.random() * 20) + 1;
      let danoFinal = 0; let custo = 0; let acaoNome = "";

      if (tipo === 'defender') {
        p.estaDefendendo = true; p.foiSuaVez = true;
        io.emit('receberMensagem', { id: Math.random().toString(), autor: "SISTEMA", texto: `🛡️ ${p.nome} está defendendo!`, cor: "#fbbf24" });
      } else {
        p.estaDefendendo = false;
        if (tipo === 'basico') {
          danoFinal = dado + p.ataque; acaoNome = "Ataque Básico";
        } else if (tipo === 'especial') {
          custo = 40; danoFinal = (dado * 2) + (p.ataque * 1.5); acaoNome = statusBase[p.classe].habilidade;
        }

        if (p.mana >= custo) {
          p.mana -= custo;
          if (dado === 20) danoFinal *= 2;
          estado.monstro.hp = Math.max(0, estado.monstro.hp - Math.floor(danoFinal));
          p.foiSuaVez = true;
          io.emit('efeitoDano', { valor: Math.floor(danoFinal), critico: dado === 20, alvo: 'monstro' });
          io.emit('receberMensagem', { id: Math.random().toString(), autor: "DADO", texto: `🎲 ${p.nome} rolou ${dado} no ${acaoNome}! Dano: ${Math.floor(danoFinal)}`, cor: "#fbbf24" });
        }
      }
      processarFluxoJogo(io);
    });

    socket.on('disconnect', () => { delete estado.jogadores[socket.id]; io.emit('atualizar', estado); });
  });

  httpServer.listen(3000, () => console.log(`🚀 [4/4] SERVIDOR EM http://localhost:3000`));
});

function processarFluxoJogo(io: Server) {
  const vivos = Object.values(estado.jogadores).filter(j => j.hp > 0);
  
  if (estado.monstro.hp <= 0) {
    // === SISTEMA DE PROGRESSÃO E DROPS ===
    estado.monstro.nivel++;
    const nv = estado.monstro.nivel;
    const moedasGanhas = 50 * (nv - 1);
    estado.moedas += moedasGanhas; // Adiciona ao banco do Squad
    
    estado.monstro.hp = 400 + (nv * 250);
    estado.monstro.maxHp = estado.monstro.hp;
    estado.monstro.ataque = 35 + (nv * 15);

    Object.values(estado.jogadores).forEach(pl => {
      pl.foiSuaVez = false;
      pl.xp += 50; // Ganha XP
      if (pl.xp >= 100) { // LEVEL UP
        pl.nivel++;
        pl.xp = pl.xp - 100;
        pl.maxHp += 40; pl.ataque += 8; pl.maxMana += 20; // Atributos sobem
        io.emit('receberMensagem', { id: Math.random().toString(), autor: "LEVEL UP", texto: `⭐ ${pl.nome} subiu para o Nível ${pl.nivel}!`, cor: "#38bdf8" });
      }
      pl.hp = pl.maxHp; // Cura full ao passar de fase
      pl.mana = pl.maxMana;
    });

    io.emit('receberMensagem', { id: Math.random().toString(), autor: "SISTEMA", texto: `🏆 O Boss caiu! Squad ganhou 💰 ${moedasGanhas} Moedas!`, cor: "#22c55e" });
  } else if (vivos.every(j => j.foiSuaVez)) {
    estado.turno = 'MONSTRO';
    io.emit('atualizar', estado);
    setTimeout(() => {
      const alvo = vivos[Math.floor(Math.random() * vivos.length)];
      if(alvo) {
        // Dano do monstro menos a Defesa do jogador (NOVO)
        let d = Math.max(0, estado.monstro.ataque - alvo.defesa);
        if(alvo.estaDefendendo) d = Math.floor(d * 0.5);
        alvo.hp = Math.max(0, alvo.hp - d);
        io.emit('efeitoDano', { valor: d, critico: false, alvo: 'player', idAlvo: alvo.id });
      }
      Object.values(estado.jogadores).forEach(pl => { pl.foiSuaVez = false; pl.estaDefendendo = false; });
      estado.turno = 'SQUAD';
      io.emit('atualizar', estado);
    }, 1200);
  }
  io.emit('atualizar', estado);
}