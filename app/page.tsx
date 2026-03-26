'use client';
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { EstadoJogo, ClasseNome, MensagemChat } from '../types';

let socket: Socket;

const MAPAS = [
  { nome: "Floresta Sombria", bg: "#064e3b", card: "#065f46", boss: "🌿" },
  { nome: "Caverna de Lava", bg: "#450a0a", card: "#7f1d1d", boss: "🔥" },
  { nome: "Pico Congelado", bg: "#0c4a6e", card: "#0ea5e922", boss: "❄️" },
  { nome: "Abismo Vazio", bg: "#1e1b4b", card: "#312e81", boss: "🌌" }
];

export default function Home() {
  const [estado, setEstado] = useState<EstadoJogo | null>(null);
  const [nome, setNome] = useState('');
  const [conectado, setConectado] = useState(false);
  const [meuId, setMeuId] = useState('');
  const [danos, setDanos] = useState<any[]>([]);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [inputChat, setInputChat] = useState('');

  useEffect(() => {
    socket = io({ path: '/api/socket' });
    socket.on('connect', () => setMeuId(socket.id || ''));
    socket.on('atualizar', (s) => setEstado(s));
    socket.on('receberMensagem', (m) => setMensagens(p => [...p, m].slice(-10)));
    socket.on('efeitoDano', (d) => {
      const n = { ...d, id: Date.now() };
      setDanos(p => [...p, n]);
      setTimeout(() => setDanos(p => p.filter(x => x.id !== n.id)), 800);
    });
    return () => { socket.disconnect(); };
  }, []);

  if (!estado) return <div className="container"><h1>Entrando na Dungeon...</h1></div>;

  // Lógica do Mapa: Muda a cada 2 níveis
  const mapaAtual = MAPAS[Math.floor((estado.monstro.nivel - 1) / 2) % MAPAS.length];

  if (!conectado) return (
    <div className="container" style={{background: '#020617'}}>
       <h1 style={{color: '#f97316', fontSize: '60px'}}>RPG SQUAD</h1>
       <input className="chat-input" style={{width: '300px', padding: '15px', marginBottom: '20px'}} placeholder="NOME DO HERÓI" value={nome} onChange={(e)=>setNome(e.target.value)} />
       <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
         {['Guerreiro', 'Mago', 'Arqueiro'].map(c => <button key={c} className="btn btn-attack" onClick={()=>{if(nome){socket.emit('entrar',{nome,classe:c});setConectado(true)}}}>{c}</button>)}
       </div>
    </div>
  );

  return (
    <div className="main-wrapper" style={{ backgroundColor: mapaAtual.bg, transition: 'background 2s ease' }}>
      <div className="container">
        <div style={{display: 'flex', gap: '20px'}}>
          
          <div className="chat-container" style={{background: 'rgba(0,0,0,0.4)'}}>
            <div style={{fontSize: '10px', color: '#aaa', marginBottom: '10px'}}>MAPA: {mapaAtual.nome.toUpperCase()}</div>
            <div className="chat-messages">
              {mensagens.map(m => <div key={m.id}><b style={{color: m.cor}}>{m.autor}:</b> {m.texto}</div>)}
            </div>
            <form onSubmit={(e)=>{e.preventDefault(); socket.emit('enviarMensagem', inputChat); setInputChat('')}}>
              <input className="chat-input" value={inputChat} onChange={(e)=>setInputChat(e.target.value)} placeholder="Chat..." />
            </form>
          </div>

          <div style={{flex: 1}}>
            <div className="boss-section" style={{background: 'rgba(0,0,0,0.3)', border: `2px solid ${mapaAtual.card}`}}>
              <div style={{fontSize: '80px'}}>{mapaAtual.boss}</div>
              <h2 style={{textShadow: '0 0 10px red'}}>{estado.monstro.nome} <small>(LVL {estado.monstro.nivel})</small></h2>
              <div className="bar-container">
                <div className="hp-bar" style={{ width: `${(estado.monstro.hp/estado.monstro.maxHp)*100}%` }}></div>
                <span className="bar-text">{estado.monstro.hp} HP</span>
              </div>
              {danos.filter(d => d.alvo === 'monstro').map(d => (
                <div key={d.id} className={`damage-popup ${d.critico ? 'damage-crit' : ''}`} style={{left: '50%', top: '20%'}}>{d.valor}</div>
              ))}
            </div>

            <div className="grid-players">
              {Object.values(estado.jogadores).map((j) => (
                <div key={j.id} className={`player-card ${j.id === meuId ? 'is-me' : ''}`} style={{background: mapaAtual.card}}>
                   {danos.filter(d => d.alvo === 'player' && d.idAlvo === j.id).map(d => (
                    <div key={d.id} className="damage-popup" style={{color: '#ff4444', top: '-10px'}}>-{d.valor}</div>
                   ))}
                   <h3 style={{margin: 0}}>{j.estaDefendendo ? '🛡️ ' : ''}{j.nome}</h3>
                   <div style={{fontSize: '10px', marginBottom: '10px'}}>LVL {j.nivel} {j.classe}</div>
                   <div className="bar-container" style={{height: '10px'}}><div className="hp-bar" style={{width: `${(j.hp/j.maxHp)*100}%`}}></div></div>
                   
                   {j.id === meuId && (
                     <div style={{marginTop: '15px', display: 'grid', gap: '5px'}}>
                        <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0} className="btn btn-attack" onClick={()=>socket.emit('usarHabilidade', 'basico')}>Atacar</button>
                        <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0} className="btn btn-skill" onClick={()=>socket.emit('usarHabilidade', 'defender')}>Defender</button>
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