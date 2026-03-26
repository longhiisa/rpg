'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { EstadoJogo, ClasseNome } from '../types';

let socket: Socket;

export default function Home() {
  const [estado, setEstado] = useState<EstadoJogo | null>(null);
  const [nome, setNome] = useState('');
  const [conectado, setConectado] = useState(false);
  const [meuId, setMeuId] = useState('');

  useEffect(() => {
    socket = io({ path: '/api/socket' });
    socket.on('connect', () => setMeuId(socket.id || ''));
    socket.on('atualizar', (s) => setEstado(s));
    return () => { socket.disconnect(); };
  }, []);

  if (!estado) return <div className="container"><h1>Sincronizando...</h1></div>;

  if (!conectado) return (
    <div className="container">
      <h1 style={{fontSize: '50px', color: '#f97316'}}>RPG SQUAD</h1>
      <div style={{background: '#0f172a', padding: '40px', borderRadius: '20px', display: 'inline-block'}}>
        <input 
          style={{padding: '15px', borderRadius: '10px', border: 'none', width: '250px', marginBottom: '20px'}}
          placeholder="NOME DO HERÓI" value={nome} onChange={(e) => setNome(e.target.value)}
        />
        <div className="grid-players">
          <button className="btn btn-attack" onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Guerreiro'});setConectado(true)}}}>🛡️ Guerreiro</button>
          <button className="btn btn-skill" onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Mago'});setConectado(true)}}}>🪄 Mago</button>
          <button className="btn btn-ult" onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Arqueiro'});setConectado(true)}}}>🏹 Arqueiro</button>
        </div>
      </div>
    </div>
  );

  const eu = estado.jogadores[meuId];

  return (
    <div className="container">
      {/* BOSS AREA */}
      <div className="boss-section">
        <span className="boss-emoji">{estado.monstro.nivel % 5 === 0 ? '🐉' : '👹'}</span>
        <h2 style={{color: '#ef4444'}}>{estado.monstro.nome} - LVL {estado.monstro.nivel}</h2>
        <div className="bar-container">
          <div className="hp-bar" style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }}></div>
          <span className="bar-text">{estado.monstro.hp} / {estado.monstro.maxHp} HP</span>
        </div>
      </div>

      {/* PLAYERS AREA */}
      <div className="grid-players">
        {Object.values(estado.jogadores).map((j) => (
          <div key={j.id} className={`player-card ${j.id === meuId ? 'is-me' : ''}`}>
            <h3>{j.nome}</h3>
            <p style={{fontSize: '12px', color: '#64748b'}}>{j.classe} LVL {j.nivel}</p>
            
            <p style={{textAlign: 'left', fontSize: '10px', margin: '5px 0'}}>Vida</p>
            <div className="bar-container" style={{height: '15px'}}>
              <div className="hp-bar" style={{ width: `${(j.hp/j.maxHp)*100}%` }}></div>
            </div>

            <p style={{textAlign: 'left', fontSize: '10px', margin: '5px 0'}}>Mana</p>
            <div className="bar-container" style={{height: '15px'}}>
              <div className="mana-bar" style={{ width: `${(j.mana/j.maxMana)*100}%` }}></div>
            </div>

            {j.id === meuId && (
              <div style={{marginTop: '20px'}}>
                <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0} 
                  className="btn btn-attack" onClick={() => socket.emit('usarHabilidade', 'basico')}>Ataque</button>
                
                {j.classe === 'Mago' && (
                  <button disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 80} 
                    className="btn btn-ult" onClick={() => socket.emit('usarHabilidade', 'explosao')}>Explosão (80 MP)</button>
                )}
                {/* Outras classes aqui... */}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}