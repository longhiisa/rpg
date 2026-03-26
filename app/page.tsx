'use client';
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { EstadoJogo, ClasseNome, MensagemChat } from '../types';

let socket: Socket;
interface DanoPop { id: number; valor: number; critico: boolean; alvo: string; idAlvo?: string; }

export default function Home() {
  const [estado, setEstado] = useState<EstadoJogo | null>(null);
  const [nome, setNome] = useState('');
  const [conectado, setConectado] = useState(false);
  const [meuId, setMeuId] = useState('');
  const [danos, setDanos] = useState<DanoPop[]>([]);
  const [shake, setShake] = useState(false);
  
  // Chat States
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [inputChat, setInputChat] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket = io({ path: '/api/socket' });
    socket.on('connect', () => setMeuId(socket.id || ''));
    socket.on('atualizar', (s) => setEstado(s));
    
    socket.on('receberMensagem', (msg: MensagemChat) => {
      setMensagens(prev => [...prev, msg].slice(-20)); // Mantém as últimas 20
    });

    socket.on('efeitoDano', (d: DanoPop) => {
      const novoDano = { ...d, id: Date.now() };
      setDanos(prev => [...prev, novoDano]);
      if (d.critico || d.alvo === 'player') {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
      setTimeout(() => setDanos(prev => prev.filter(x => x.id !== novoDano.id)), 1000);
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviarMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputChat.trim()) {
      socket.emit('enviarMensagem', inputChat);
      setInputChat('');
    }
  };

  if (!estado) return <div className="container"><h1>Sincronizando Squad...</h1></div>;

  if (!conectado) return (
    <div className="container">
      <h1 style={{fontSize: '50px', color: '#f97316', fontWeight: '900'}}>RPG SQUAD</h1>
      <div style={{background: '#0f172a', padding: '40px', borderRadius: '30px', border: '2px solid #1e293b'}}>
        <input 
          style={{padding: '15px', borderRadius: '12px', border: 'none', width: '280px', marginBottom: '25px', textAlign: 'center', fontWeight: 'bold'}}
          placeholder="NOME DO HERÓI" value={nome} onChange={(e) => setNome(e.target.value)}
        />
        <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
          <button className="btn btn-attack" onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Guerreiro'});setConectado(true)}}}>🛡️ Guerreiro</button>
          <button className="btn btn-skill" onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Mago'});setConectado(true)}}}>🪄 Mago</button>
          <button className="btn btn-ult" onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Arqueiro'});setConectado(true)}}}>🏹 Arqueiro</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`container ${shake ? 'shake' : ''}`}>
      <div style={{display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
        
        {/* Lado Esquerdo: Chat */}
        <div className="chat-container">
          <div className="chat-messages">
            {mensagens.map(m => (
              <div key={m.id} style={{marginBottom: '5px', textAlign: 'left', fontSize: '12px'}}>
                <span style={{color: m.cor, fontWeight: 'bold'}}>[{m.autor}]: </span>
                <span>{m.texto}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={enviarMsg} style={{display: 'flex', gap: '5px'}}>
            <input 
              value={inputChat} 
              onChange={(e) => setInputChat(e.target.value)}
              placeholder="Falar com Squad..."
              className="chat-input"
            />
            <button type="submit" className="btn btn-attack" style={{padding: '5px 10px', marginTop: 0}}>↵</button>
          </form>
        </div>

        {/* Lado Direito: Jogo */}
        <div style={{flex: 1}}>
          <div className="boss-section" style={{position: 'relative'}}>
            {danos.filter(d => d.alvo === 'monstro').map(d => (
              <div key={d.id} className={`damage-popup ${d.critico ? 'damage-crit' : ''}`} style={{left: '50%', top: '20%'}}>{d.valor}</div>
            ))}
            <span className="boss-emoji">{estado.monstro.nivel % 5 === 0 ? '🐉' : '👹'}</span>
            <h2 style={{color: '#ef4444'}}>{estado.monstro.nome} - LVL {estado.monstro.nivel}</h2>
            <div className="bar-container">
              <div className="hp-bar" style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }}></div>
              <span className="bar-text">{estado.monstro.hp} HP</span>
            </div>
          </div>

          <div className="grid-players">
            {Object.values(estado.jogadores).map((j) => (
              <div key={j.id} className={`player-card ${j.id === meuId ? 'is-me' : ''}`} style={{position: 'relative'}}>
                {danos.filter(d => d.alvo === 'player' && d.idAlvo === j.id).map(d => (
                  <div key={d.id} className="damage-popup" style={{left: '50%', top: '-20px', color: '#ff4444'}}>-{d.valor}</div>
                ))}
                <h3>{j.nome}</h3>
                <div className="bar-container" style={{height: '10px', marginTop: '10px'}}>
                  <div className="hp-bar" style={{ width: `${(j.hp/j.maxHp)*100}%` }}></div>
                </div>
                <div className="bar-container" style={{height: '8px', marginTop: '5px', borderColor: '#1e3a8a'}}>
                  <div className="mana-bar" style={{ width: `${(j.mana/j.maxMana)*100}%` }}></div>
                </div>

                {j.id === meuId && (
                  <div style={{marginTop: '15px', display: 'grid', gap: '5px'}}>
                    <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0} 
                      className="btn btn-attack" onClick={() => socket.emit('usarHabilidade', 'basico')}>Ataque</button>
                    {j.classe === 'Mago' && (
                       <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 80} 
                       className="btn btn-ult" onClick={() => socket.emit('usarHabilidade', 'explosao')}>Explosão (80 MP)</button>
                    )}
                    {j.classe === 'Guerreiro' && (
                       <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 20} 
                       className="btn btn-skill" onClick={() => socket.emit('usarHabilidade', 'golpe')}>Golpe (20 MP)</button>
                    )}
                    {j.classe === 'Arqueiro' && (
                       <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 25} 
                       className="btn btn-skill" onClick={() => socket.emit('usarHabilidade', 'preciso')}>Tiro (25 MP)</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}