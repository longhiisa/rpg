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
    socket.on('notificacao', (m) => setLogs(p => [m, ...p].slice(0, 6)));
    return () => { socket.disconnect(); };
  }, []);

  const usarSkill = (tipo: string) => socket.emit('usarHabilidade', tipo);

  if (!estado) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-orange-500 font-black tracking-[0.3em] animate-pulse">CARREGANDO ARENA...</p>
      </div>
    </div>
  );

  if (!conectado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>

      <div className="relative z-10 w-full max-w-md">
        <h1 className="text-7xl font-black mb-2 text-center italic tracking-tighter text-white drop-shadow-2xl">
          RPG<span className="text-orange-500 underline decoration-white/20">SQUAD</span>
        </h1>
        <p className="text-center text-slate-500 font-bold mb-12 tracking-widest uppercase text-xs">Battle Royale PvE Online</p>
        
        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="mb-8">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Assinatura do Herói</label>
            <input 
              type="text" 
              className="w-full bg-slate-800/50 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:ring-2 ring-orange-500 transition-all font-bold placeholder:text-slate-600"
              placeholder="Ex: Arthemis_II" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid gap-4">
            <button onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Guerreiro'});setConectado(true)}}} 
              className="group relative overflow-hidden bg-gradient-to-r from-blue-700 to-blue-900 p-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl">
              <span className="relative z-10 flex items-center justify-center gap-3">⚔️ Guerreiro <span className="text-[10px] opacity-50 font-normal">Tanke</span></span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <button onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Mago'});setConectado(true)}}} 
              className="group relative overflow-hidden bg-gradient-to-r from-purple-700 to-purple-900 p-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl">
              <span className="relative z-10 flex items-center justify-center gap-3">🪄 Mago <span className="text-[10px] opacity-50 font-normal">Dano Especial</span></span>
            </button>
            <button onClick={() => {if(nome){socket.emit('entrar',{nome,classe:'Arqueiro'});setConectado(true)}}} 
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-700 to-emerald-900 p-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl">
              <span className="relative z-10 flex items-center justify-center gap-3">🏹 Arqueiro <span className="text-[10px] opacity-50 font-normal">Crítico</span></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const eu = estado.jogadores[meuId];

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-orange-500">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: LOGS E STATUS SQUAD */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Feed de Batalha
            </h3>
            <div className="space-y-3">
              {logs.map((l, i) => (
                <p key={i} className="text-[11px] leading-relaxed text-slate-300 font-medium animate-in slide-in-from-left duration-300">
                  <span className="text-orange-500 font-black mr-2">#</span> {l}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA CENTRAL: ARENA DO MONSTRO */}
        <div className="lg:col-span-6 flex flex-col items-center py-8 order-1 lg:order-2">
          <div className="relative group mb-12">
            <div className="absolute inset-0 bg-red-600/20 blur-[80px] group-hover:bg-red-600/40 transition-all duration-1000"></div>
            <div className="relative text-[12rem] drop-shadow-[0_25px_25px_rgba(0,0,0,0.5)] animate-float scale-110">
              {estado.monstro.nivel > 5 ? '🐉' : '👹'}
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-xl border border-white/20">
              BOSS LVL {estado.monstro.nivel}
            </div>
          </div>

          <h2 className="text-4xl font-black mb-6 uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            {estado.monstro.nome}
          </h2>

          <div className="w-full max-w-xl space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-red-500 mb-1 px-2">
              <span>Vitalidade do Chefe</span>
              <span>{Math.round((estado.monstro.hp / estado.monstro.maxHp) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-950 h-6 rounded-full border-2 border-slate-800 p-1 shadow-inner relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-900 via-red-600 to-red-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(220,38,38,0.5)]" 
                style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }} 
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md">
                {estado.monstro.hp.toLocaleString()} / {estado.monstro.maxHp.toLocaleString()} HP
              </span>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: SEUS STATUS (Onde você vê sua HP/MP) */}
        <div className="lg:col-span-3 order-3">
          {eu && (
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 rounded-[2rem] border-2 border-orange-500/50 shadow-2xl sticky top-8 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl bg-slate-800 p-3 rounded-2xl border border-white/10 shadow-lg">
                  {eu.classe === 'Guerreiro' ? '🛡️' : eu.classe === 'Mago' ? '🪄' : '🏹'}
                </div>
                <div>
                  <h4 className="font-black text-xl uppercase tracking-tighter leading-none">{eu.nome}</h4>
                  <p className="text-[10px] font-black text-orange-500 tracking-widest uppercase">VOCÊ • LVL {eu.nivel}</p>
                </div>
              </div>

              {/* BARRA DE VIDA DO JOGADOR */}
              <div className="mb-4">
                <div className="flex justify-between text-[9px] font-black uppercase mb-1 px-1">
                  <span className="text-green-500">Vida (HP)</span>
                  <span>{eu.hp}/{eu.maxHp}</span>
                </div>
                <div className="h-4 bg-black rounded-lg border border-white/5 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-700 to-green-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" style={{ width: `${(eu.hp/eu.maxHp)*100}%` }}></div>
                </div>
              </div>

              {/* BARRA DE MANA DO JOGADOR */}
              <div className="mb-8">
                <div className="flex justify-between text-[9px] font-black uppercase mb-1 px-1">
                  <span className="text-blue-500">Energia (MP)</span>
                  <span>{eu.mana}/{eu.maxMana}</span>
                </div>
                <div className="h-4 bg-black rounded-lg border border-white/5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-700 to-blue-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" style={{ width: `${(eu.mana/eu.maxMana)*100}%` }}></div>
                </div>
              </div>

              {/* AÇÕES */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-center text-slate-500 uppercase tracking-widest mb-2">Painel de Ações - {estado.turno}</p>
                <button 
                  disabled={estado.turno !== 'SQUAD' || eu.foiSuaVez || eu.hp <= 0}
                  onClick={() => usarSkill('basico')}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-b-4 border-slate-900 shadow-lg"
                >
                  ⚔️ Ataque Básico
                </button>
                
                {eu.classe === 'Guerreiro' && (
                  <button 
                    disabled={estado.turno !== 'SQUAD' || eu.foiSuaVez || eu.mana < 20 || eu.hp <= 0}
                    onClick={() => usarSkill('golpe')}
                    className="w-full py-3 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-b-4 border-blue-900 shadow-lg"
                  >
                    🔨 Golpe Pesado (20 MP)
                  </button>
                )}

                {eu.classe === 'Mago' && (
                  <>
                    <button 
                      disabled={estado.turno !== 'SQUAD' || eu.foiSuaVez || eu.mana < 30 || eu.hp <= 0}
                      onClick={() => usarSkill('missil')}
                      className="w-full py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-b-4 border-purple-900 shadow-lg"
                    >
                      🔮 Míssil Mágico (30 MP)
                    </button>
                    <button 
                      disabled={estado.turno !== 'SQUAD' || eu.foiSuaVez || eu.mana < 80 || eu.hp <= 0}
                      onClick={() => usarSkill('explosao')}
                      className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:opacity-30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-b-4 border-red-900 shadow-lg"
                    >
                      💥 Explosão Arcana (80 MP)
                    </button>
                  </>
                )}

                {eu.classe === 'Arqueiro' && (
                  <button 
                    disabled={estado.turno !== 'SQUAD' || eu.foiSuaVez || eu.mana < 25 || eu.hp <= 0}
                    onClick={() => usarSkill('preciso')}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-b-4 border-emerald-900 shadow-lg"
                  >
                    🎯 Tiro Preciso (25 MP)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SQUAD LIST (FOOTER) */}
      <div className="max-w-7xl mx-auto mt-12 pt-12 border-t border-white/5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 text-center italic">Aliados na Arena</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.values(estado.jogadores).map((j) => (
            j.id !== meuId && (
              <div key={j.id} className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="text-3xl grayscale">{j.classe === 'Guerreiro' ? '🛡️' : j.classe === 'Mago' ? '🪄' : '🏹'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate">{j.nome}</p>
                  <div className="flex gap-1 mt-1">
                    <div className="h-1 bg-green-500/50 rounded-full flex-1" style={{ width: `${(j.hp/j.maxHp)*100}%` }}></div>
                    <div className="h-1 bg-blue-500/50 rounded-full w-1/3" style={{ width: `${(j.mana/j.maxMana)*100}%` }}></div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </main>
  );
}