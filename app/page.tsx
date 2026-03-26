// app/page.tsx
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
    // Tenta conectar no localhost explicitamente se estiver em dev
    const url = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    
    socket = io(url, { 
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log("Conectado ao Servidor!");
      setMeuId(socket.id || '');
    });

    socket.on('atualizar', (s) => {
      console.log("Estado recebido:", s);
      setEstado(s);
    });

    socket.on('connect_error', (err) => {
      console.error("Erro de conexão do socket:", err);
    });

    return () => { socket.disconnect(); };
  }, []);

  const entrar = (classe: ClasseNome) => {
    if (!nome) return alert("Nome vazio!");
    socket.emit('entrar', { nome, classe });
    setConectado(true);
  };

  if (!estado) return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center italic">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500 mb-4"></div>
      <p className="animate-pulse tracking-widest text-xs">SINCRONIZANDO COM A ARENA...</p>
    </div>
  );

  if (!conectado) return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl font-black mb-12 text-orange-500 italic uppercase">RPG Squad</h1>
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
        <input 
          type="text" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 text-white outline-none"
          placeholder="NOME DO HERÓI" value={nome} onChange={(e) => setNome(e.target.value)}
        />
        <div className="grid gap-3">
          <button onClick={() => entrar('Guerreiro')} className="bg-blue-700 p-4 rounded-xl font-bold uppercase hover:bg-blue-600 transition-all">⚔️ Guerreiro</button>
          <button onClick={() => entrar('Mago')} className="bg-purple-700 p-4 rounded-xl font-bold uppercase hover:bg-purple-600 transition-all">🔥 Mago</button>
          <button onClick={() => entrar('Arqueiro')} className="bg-emerald-700 p-4 rounded-xl font-bold uppercase hover:bg-emerald-600 transition-all">🏹 Arqueiro</button>
        </div>
      </div>
    </div>
  );

  const eu = estado.jogadores[meuId];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-12">
          <h2 className="text-red-500 font-black text-2xl uppercase tracking-tighter italic">{estado.monstro.nome} Lvl {estado.monstro.nivel}</h2>
          <div className="w-full bg-slate-900 h-8 rounded-xl border-2 border-slate-800 mt-4 relative overflow-hidden shadow-2xl">
            <div className="bg-red-600 h-full transition-all duration-1000" style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase tracking-widest">{estado.monstro.hp} HP</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(estado.jogadores).map((j) => (
            <div key={j.id} className={`p-6 rounded-2xl border-2 ${j.id === meuId ? 'border-orange-500 bg-slate-900 shadow-xl' : 'border-slate-800 bg-slate-900/40 opacity-70'}`}>
              <p className="font-black text-lg mb-1">{j.nome}</p>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-4">Lvl {j.nivel} {j.classe}</p>
              <div className="w-full bg-slate-800 h-2 rounded-full mb-6">
                <div className="bg-green-500 h-full" style={{ width: `${(j.hp / j.maxHp) * 100}%` }} />
              </div>
              {j.id === meuId && (
                <button 
                  disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0}
                  onClick={() => socket.emit('atacar')}
                  className="w-full py-3 bg-orange-500 rounded-xl font-black text-slate-950 uppercase text-xs hover:bg-orange-400 disabled:bg-slate-800 transition-all active:scale-95"
                >
                  {j.hp <= 0 ? 'Morto' : j.foiSuaVez ? 'Aguardando' : 'Atacar'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}