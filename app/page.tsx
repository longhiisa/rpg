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
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    socket = io({ path: '/api/socket' });
    socket.on('connect', () => setMeuId(socket.id || ''));
    socket.on('atualizar', (s) => setEstado(s));
    socket.on('notificacao', (m) => setLogs(p => [m, ...p].slice(0, 5)));
    return () => { socket.disconnect(); };
  }, []);

  const usarSkill = (tipo: string) => socket.emit('usarHabilidade', tipo);

  if (!estado) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-orange-500 font-black tracking-[0.3em] animate-pulse">SINCRONIZANDO ARENA...</p>
      </div>
    </div>
  );

  if (!conectado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e293b,0%,#020617_100%)] opacity-50"></div>
      
      <div className="relative z-10 w-full max-w-md text-center">
        <h1 className="text-6xl font-black mb-4 italic tracking-tighter bg-gradient-to-br from-white to-orange-500 bg-clip-text text-transparent uppercase">
          RPG SQUAD
        </h1>
        <p className="text-slate-500 font-bold mb-10 tracking-[0.4em] text-xs uppercase">Online Battle Arena</p>
        
        <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <input 
            type="text" 
            className="w-full bg-slate-800/50 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:ring-2 ring-orange-500 transition-all font-bold text-center mb-8"
            placeholder="NOME DO SEU HERÓI" 
            value={nome} 
            onChange={(e) => setNome(e.target.value)}
          />

          <div className="grid gap-4">
            <button onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Guerreiro'});setConectado(true)}}} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 p-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-125 transition-all shadow-lg active:scale-95">
              ⚔️ Guerreiro
            </button>
            <button onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Mago'});setConectado(true)}}} 
              className="bg-gradient-to-r from-purple-600 to-purple-800 p-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-125 transition-all shadow-lg active:scale-95">
              🔮 Mago
            </button>
            <button onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Arqueiro'});setConectado(true)}}} 
              className="bg-gradient-to-r from-emerald-600 to-emerald-800 p-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-125 transition-all shadow-lg active:scale-95">
              🏹 Arqueiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const eu = estado.jogadores[meuId];

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        
        {/* HEADER: LOGS & STATUS DO TURNO */}
        <div className="w-full flex flex-col md:flex-row justify-between gap-6 mb-12">
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 w-full md:w-72 shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Log de Batalha</p>
            {logs.map((l, i) => (
              <p key={i} className="text-[11px] text-slate-400 mb-1 animate-pulse">» {l}</p>
            ))}
          </div>
          <div className="text-center md:text-right self-center">
            <div className={`inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${estado.turno === 'SQUAD' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              Turno: {estado.turno}
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Arena de Combate</h2>
          </div>
        </div>

        {/* BOSS CENTRAL */}
        <div className="flex flex-col items-center mb-20 w-full relative">
          <div className="absolute -top-20 text-[12rem] opacity-10 select-none animate-pulse">💀</div>
          <div className="relative z-10 text-[10rem] drop-shadow-[0_0_40px_rgba(239,68,68,0.4)] mb-4 transition-transform hover:scale-110 duration-500">
            {estado.monstro.nivel % 5 === 0 ? '🐉' : '👹'}
          </div>
          <h3 className="text-3xl font-black text-red-500 uppercase italic mb-6 tracking-tighter">
            {estado.monstro.nome} <span className="text-white text-lg bg-red-600 px-2 rounded ml-2">LVL {estado.monstro.nivel}</span>
          </h3>
          <div className="w-full max-w-2xl px-4">
            <div className="w-full bg-slate-950 h-8 rounded-2xl border-2 border-slate-800 p-1 relative overflow-hidden shadow-2xl">
              <div 
                className="bg-gradient-to-r from-red-800 via-red-600 to-red-400 h-full rounded-xl transition-all duration-1000 shadow-[0_0_20px_rgba(220,38,38,0.5)]" 
                style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }} 
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest drop-shadow-md">
                {estado.monstro.hp.toLocaleString()} / {estado.monstro.maxHp.toLocaleString()} HP
              </span>
            </div>
          </div>
        </div>

        {/* GRADE DE JOGADORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {Object.values(estado.jogadores).map((j) => (
            <div 
              key={j.id} 
              className={`p-6 rounded-[2rem] border-2 transition-all duration-500 ${
                j.id === meuId 
                ? 'border-orange-500 bg-slate-900 shadow-[0_0_30px_rgba(249,115,22,0.15)] scale-105 z-20' 
                : 'border-slate-800 bg-slate-900/40 opacity-80'
              } ${j.hp <= 0 ? 'grayscale brightness-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-xl truncate w-32 tracking-tighter uppercase italic">{j.nome}</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{j.classe}</p>
                </div>
                <div className="text-3xl">{j.classe === 'Guerreiro' ? '🛡️' : j.classe === 'Mago' ? '🪄' : '🏹'}</div>
              </div>

              {/* BARRAS STATUS */}
              <div className="space-y-3 mb-6">
                <div>
                  <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                    <span className="text-green-500">Saúde</span>
                    <span>{j.hp}/{j.maxHp}</span>
                  </div>
                  <div className="h-2.5 bg-black rounded-full border border-white/5 overflow-hidden p-[1px]">
                    <div className="bg-gradient-to-r from-green-700 to-green-400 h-full rounded-full transition-all" style={{ width: `${(j.hp/j.maxHp)*100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                    <span className="text-blue-500">Mana</span>
                    <span>{j.mana}/{j.maxMana}</span>
                  </div>
                  <div className="h-2 bg-black rounded-full border border-white/5 overflow-hidden p-[1px]">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-400 h-full rounded-full transition-all" style={{ width: `${(j.mana/j.maxMana)*100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO (Somente para você) */}
              {j.id === meuId && (
                <div className="grid gap-2">
                  <button 
                    disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0}
                    onClick={() => usarSkill('basico')}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                  >
                    ⚔️ Atacar (0 MP)
                  </button>
                  
                  {j.classe === 'Guerreiro' && (
                    <button 
                      disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 20 || j.hp <= 0}
                      onClick={() => usarSkill('golpe')}
                      className="w-full py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                    >
                      🔨 Golpe Pesado (20 MP)
                    </button>
                  )}

                  {j.classe === 'Mago' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 30 || j.hp <= 0}
                        onClick={() => usarSkill('missil')}
                        className="py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-30 rounded-xl font-black text-[8px] uppercase tracking-tighter transition-all"
                      >
                        🔮 Míssil (30)
                      </button>
                      <button 
                        disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 80 || j.hp <= 0}
                        onClick={() => usarSkill('explosao')}
                        className="py-2 bg-red-700 hover:bg-red-600 disabled:opacity-30 rounded-xl font-black text-[8px] uppercase tracking-tighter transition-all shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                      >
                        💥 EXPLODIR (80)
                      </button>
                    </div>
                  )}

                  {j.classe === 'Arqueiro' && (
                    <button 
                      disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.mana < 25 || j.hp <= 0}
                      onClick={() => usarSkill('preciso')}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                    >
                      🎯 Tiro Preciso (25 MP)
                    </button>
                  )}
                  
                  {j.foiSuaVez && j.hp > 0 && (
                    <p className="text-[8px] font-black text-center text-green-500 animate-pulse mt-1">PRONTO PARA O PRÓXIMO TURNO</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FOOTER STATUS */}
        <div className="mt-16 text-slate-600 text-[10px] font-black uppercase tracking-[0.5em] text-center">
          RPG SQUAD • Versão 1.0.4 • Estável
        </div>
      </div>
    </main>
  );
}