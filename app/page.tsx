'use client';
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { EstadoJogo, MensagemChat, Item } from '../types';

let socket: Socket;

interface DanoPop { id: number; valor: number; critico: boolean; alvo: string; idAlvo?: string; }

const MAPAS = [
  { nome: "Floresta Sombria", bg: "#064e3b", card: "#065f46", boss: "🌿" },
  { nome: "Caverna de Lava", bg: "#450a0a", card: "#7f1d1d", boss: "🔥" },
  { nome: "Pico Congelado", bg: "#0c4a6e", card: "#0ea5e922", boss: "❄️" },
  { nome: "Abismo Vazio", bg: "#1e1b4b", card: "#312e81", boss: "🌌" }
];

// ITENS DA LOJA
const ITENS_LOJA: Item[] = [
  { id: '1', nome: 'Espada Longa', tipo: 'ataque', valor: 15, preco: 50, icone: '🗡️' },
  { id: '2', nome: 'Escudo de Ferro', tipo: 'defesa', valor: 10, preco: 50, icone: '🛡️' },
  { id: '3', nome: 'Amuleto Vital', tipo: 'vida', valor: 100, preco: 80, icone: '❤️' }
];

export default function Home() {
  const [estado, setEstado] = useState<EstadoJogo | null>(null);
  const [nome, setNome] = useState('');
  const [conectado, setConectado] = useState(false);
  const [meuId, setMeuId] = useState('');
  const [danos, setDanos] = useState<DanoPop[]>([]);
  const [shake, setShake] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [inputChat, setInputChat] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket = io({ path: '/api/socket' });
    socket.on('connect', () => setMeuId(socket.id || ''));
    socket.on('atualizar', (s) => setEstado(s));
    socket.on('receberMensagem', (msg: MensagemChat) => setMensagens(prev => [...prev, msg].slice(-20)));
    socket.on('efeitoDano', (d: DanoPop) => {
      const n = { ...d, id: Date.now() }; setDanos(prev => [...prev, n]);
      if (d.critico || d.alvo === 'player') { setShake(true); setTimeout(() => setShake(false), 300); }
      setTimeout(() => setDanos(prev => prev.filter(x => x.id !== n.id)), 800);
    });
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [mensagens]);

  const comprarItem = (item: Item) => { socket.emit('comprarItem', item); };

  if (!estado) return <div className="container"><h1>Carregando Dungeon...</h1></div>;

  const mapaAtual = MAPAS[Math.floor((estado.monstro.nivel - 1) / 2) % MAPAS.length];

  if (!conectado) return (
    <div className="container" style={{background: '#020617', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
      <h1 style={{fontSize: '60px', color: '#f97316', fontWeight: '900', marginBottom: '10px'}}>RPG SQUAD</h1>
      <div style={{background: '#0f172a', padding: '40px', borderRadius: '30px', border: '2px solid #1e293b', textAlign: 'center'}}>
        <input style={{padding: '15px', borderRadius: '12px', width: '280px', marginBottom: '25px', textAlign: 'center', fontWeight: 'bold'}} placeholder="NOME DO HERÓI" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
          {['Guerreiro', 'Mago', 'Arqueiro'].map(c => (
            <button key={c} className="btn btn-attack" onClick={() => {if(nome){socket.emit('entrar',{nome,classe:c});setConectado(true)}}}>{c}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="main-wrapper" style={{ backgroundColor: mapaAtual.bg }}>
      <div className={`container ${shake ? 'shake' : ''}`}>
        
        {/* BANCO E LOJA DO SQUAD */}
        <div style={{ background: '#0f172a', padding: '15px 30px', borderRadius: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #eab308'}}>
          <h3 style={{margin: 0, color: '#eab308'}}>💰 Tesouro do Squad: {estado.moedas} Moedas</h3>
          <div style={{display: 'flex', gap: '10px'}}>
            <span style={{fontSize: '14px', marginRight: '10px', color: '#94a3b8', alignSelf: 'center'}}>Loja:</span>
            {ITENS_LOJA.map(item => (
              <button key={item.id} onClick={() => comprarItem(item)} disabled={estado.moedas < item.preco} className="btn" style={{background: '#1e293b', border: '1px solid #475569', color: 'white'}}>
                {item.icone} {item.nome} (-{item.preco})
              </button>
            ))}
          </div>
        </div>

        <div style={{display: 'flex', gap: '25px', alignItems: 'flex-start'}}>
          
          {/* CHAT */}
          <div className="chat-container" style={{background: 'rgba(0,0,0,0.5)'}}>
            <div style={{fontSize: '10px', color: '#fbbf24', fontWeight: 'bold', marginBottom: '10px'}}>📍 {mapaAtual.nome.toUpperCase()}</div>
            <div className="chat-messages">
              {mensagens.map(m => <div key={m.id} style={{marginBottom: '6px', textAlign: 'left', fontSize: '12px'}}><span style={{color: m.cor, fontWeight: 'bold'}}>[{m.autor}]: </span><span style={{color: '#e2e8f0'}}>{m.texto}</span></div>)}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if(inputChat.trim()){socket.emit('enviarMensagem', inputChat); setInputChat('');} }} style={{display: 'flex'}}>
              <input value={inputChat} onChange={(e) => setInputChat(e.target.value)} placeholder="Conversar..." className="chat-input" />
            </form>
          </div>

          {/* COMBATE E JOGADORES */}
          <div style={{flex: 1}}>
            <div className="boss-section" style={{position: 'relative', background: 'rgba(0,0,0,0.2)', border: `2px solid ${mapaAtual.card}`}}>
              {danos.filter(d => d.alvo === 'monstro').map(d => <div key={d.id} className={`damage-popup ${d.critico ? 'damage-crit' : ''}`} style={{left: '50%', top: '20%'}}>{d.valor}</div>)}
              <span className="boss-emoji" style={{fontSize: '120px'}}>{mapaAtual.boss}</span>
              <h2 style={{color: '#ef4444', textTransform: 'uppercase'}}>{estado.monstro.nome} <small>(LVL {estado.monstro.nivel})</small></h2>
              <div className="bar-container" style={{maxWidth: '500px', margin: '0 auto'}}>
                <div className="hp-bar" style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }}></div>
                <span className="bar-text">{estado.monstro.hp} / {estado.monstro.maxHp} HP</span>
              </div>
            </div>

            <div className="grid-players">
              {Object.values(estado.jogadores).map((j: any) => (
                <div key={j.id} className={`player-card ${j.id === meuId ? 'is-me' : ''}`} style={{position: 'relative', background: mapaAtual.card}}>
                  {danos.filter(d => d.alvo === 'player' && d.idAlvo === j.id).map(d => <div key={d.id} className="damage-popup" style={{left: '50%', top: '-20px', color: '#ff4444'}}>-{d.valor}</div>)}
                  
                  <h3 style={{margin: '0 0 5px 0'}}>{j.estaDefendendo ? '🛡️ ' : ''}{j.nome} <small style={{fontSize: '12px', color: '#fbbf24'}}>Lvl {j.nivel}</small></h3>
                  <div style={{fontSize: '10px', color: '#cbd5e1', marginBottom: '5px'}}>
                    ⚔️ ATK: {j.ataque} | 🛡️ DEF: {j.defesa}
                  </div>

                  {/* Inventário */}
                  <div style={{display: 'flex', gap: '2px', justifyContent: 'center', marginBottom: '10px', minHeight: '20px'}}>
                    {j.inventario.map((item: Item, idx: number) => <span key={idx} title={item.nome}>{item.icone}</span>)}
                  </div>
                  
                  {/* BARRAS DE STATUS */}
                  <div className="bar-container" style={{height: '10px'}}><div className="hp-bar" style={{ width: `${(j.hp/j.maxHp)*100}%` }}></div></div>
                  <div className="bar-container" style={{height: '8px', marginTop: '3px', borderColor: '#1e3a8a'}}><div className="mana-bar" style={{ width: `${(j.mana/j.maxMana)*100}%` }}></div></div>
                  {/* BARRA DE XP */}
                  <div className="bar-container" style={{height: '4px', marginTop: '3px', borderColor: '#064e3b'}}><div style={{ background: '#22c55e', height: '100%', width: `${j.xp}%` }}></div></div>

                  {j.id === meuId && (
                    <div style={{marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                      <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0} className="btn btn-attack" style={{gridColumn: 'span 2'}} onClick={() => socket.emit('usarHabilidade', 'basico')}>⚔️ Ataque (D20)</button>
                      <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0} className="btn btn-skill" style={{background: '#059669'}} onClick={() => socket.emit('usarHabilidade', 'defender')}>🛡️ Defender</button>
                      <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 40} className="btn btn-ult" onClick={() => socket.emit('usarHabilidade', 'especial')}>✨ Especial (40 MP)</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}