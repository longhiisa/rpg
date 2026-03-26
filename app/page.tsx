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
  const [meuId, setMeuId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Conecta usando o path específico configurado no servidor
    socket = io({
      path: '/api/socket',
    });

    socket.on('connect', () => {
      setMeuId(socket.id || '');
    });

    socket.on('atualizar', (novoEstado: EstadoJogo) => {
      setEstado(novoEstado);
    });

    socket.on('notificacao', (msg: string) => {
      setLogs((prev) => [msg, ...prev].slice(0, 5));
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleEntrar = (classe: ClasseNome) => {
    if (!nome) return alert("Digite seu nome!");
    socket.emit('entrar', { nome, classe });
    setConectado(true);
  };

  if (!estado) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
        <span className="mt-4 text-xl font-bold tracking-widest">SINCRONIZANDO COM O SERVIDOR...</span>
      </div>
    );
  }

  if (!conectado) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">RPG SQUAD</h1>
        <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 w-full max-w-md">
          <input 
            type="text" className="w-full bg-slate-800 border border-slate-700 p-3 rounded mb-6 text-white outline-none focus:border-orange-500"
            placeholder="Nome do Herói" value={nome} onChange={(e) => setNome(e.target.value)}
          />
          <div className="grid gap-3">
            <button onClick={() => handleEntrar('Guerreiro')} className="bg-blue-700 p-4 rounded font-bold hover:scale-105 transition-transform">⚔️ Guerreiro</button>
            <button onClick={() => handleEntrar('Mago')} className="bg-purple-700 p-4 rounded font-bold hover:scale-105 transition-transform">🔥 Mago</button>
            <button onClick={() => handleEntrar('Arqueiro')} className="bg-emerald-700 p-4 rounded font-bold hover:scale-105 transition-transform">🏹 Arqueiro</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-orange-500 font-black text-2xl uppercase">Batalha</h2>
            <p className="text-sm font-bold tracking-widest">TURNO: {estado.turno}</p>
          </div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800 text-[10px] w-48">
            {logs.map((l, i) => <p key={i} className="text-slate-300">» {l}</p>)}
          </div>
        </div>

        <div className="flex flex-col items-center mb-16">
          <div className="text-9xl mb-4 drop-shadow-2xl">👿</div>
          <h2 className="text-3xl font-black text-red-600 mb-4">{estado.monstro.nome} (Lvl {estado.monstro.nivel})</h2>
          <div className="w-full bg-slate-900 h-6 rounded-full border-2 border-slate-800 relative overflow-hidden">
            <div className="bg-red-600 h-full transition-all duration-500" style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{estado.monstro.hp} HP</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(estado.jogadores).map((j) => (
            <div key={j.id} className={`p-4 rounded-xl border-2 ${j.id === meuId ? 'border-orange-500 bg-slate-900' : 'border-slate-800 bg-slate-900/50'}`}>
              <p className="font-bold text-lg">{j.nome}</p>
              <p className="text-[10px] uppercase text-slate-500 mb-2">Lvl {j.nivel} {j.classe}</p>
              <div className="w-full bg-slate-800 h-2 rounded-full mb-4">
                <div className="bg-green-500 h-full" style={{ width: `${(j.hp / j.maxHp) * 100}%` }} />
              </div>
              {j.id === meuId && (
                <button 
                  disabled={estado.turno !== 'SQUAD' || j.foiSuaVez || j.hp <= 0}
                  onClick={() => socket.emit('atacar')}
                  className="w-full py-2 bg-orange-500 rounded font-black text-xs uppercase disabled:bg-slate-800"
                >
                  {j.foiSuaVez ? 'Aguardando' : 'Atacar'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}