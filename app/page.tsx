// app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { EstadoJogo } from '../types';

let socket: Socket;

export default function Jogo() {
  const [estado, setEstado] = useState<EstadoJogo | null>(null);
  const [nome, setNome] = useState('');
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    socket = io();
    socket.on('atualizar', (novoEstado: EstadoJogo) => setEstado(novoEstado));
    return () => { socket.disconnect(); };
  }, []);

  const entrar = (classe: any) => {
    socket.emit('entrar', { nome, classe });
    setConectado(true);
  };

  if (!estado) return <p>Carregando...</p>;

  if (!conectado) {
    return (
      <div className="flex flex-col items-center p-20 gap-4 bg-slate-900 min-h-screen text-white">
        <h1 className="text-4xl font-bold">RPG Squad Online</h1>
        <input 
          className="text-black p-2 rounded" 
          placeholder="Seu nome" 
          onChange={(e) => setNome(e.target.value)} 
        />
        <div className="flex gap-2">
          <button onClick={() => entrar('Guerreiro')} className="bg-red-600 p-4 rounded">Guerreiro ⚔️</button>
          <button onClick={() => entrar('Mago')} className="bg-blue-600 p-4 rounded">Mago 🔥</button>
          <button onClick={() => entrar('Arqueiro')} className="bg-green-600 p-4 rounded">Arqueiro 🏹</button>
        </div>
      </div>
    );
  }

  return (
    <main className="p-10 bg-slate-800 min-h-screen text-white">
      {/* AREA DO MONSTRO */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-64 h-64 bg-red-500 rounded-lg flex items-center justify-center text-6xl shadow-2xl">👿</div>
        <h2 className="text-2xl mt-4">{estado.monstro.nome}</h2>
        <div className="w-full max-w-md bg-gray-700 h-4 rounded-full mt-2">
          <div 
            className="bg-red-600 h-4 rounded-full transition-all" 
            style={{ width: `${(estado.monstro.hp / estado.monstro.maxHp) * 100}%` }}
          />
        </div>
        <p>{estado.monstro.hp} HP</p>
      </div>

      {/* AREA DOS JOGADORES */}
      <div className="grid grid-cols-4 gap-4">
        {Object.values(estado.jogadores).map((p) => (
          <div key={p.id} className={`p-4 border-2 rounded ${p.id === socket.id ? 'border-yellow-400' : 'border-transparent'} bg-slate-700`}>
            <p className="font-bold">{p.nome} (Lvl {p.nivel})</p>
            <p className="text-sm">{p.classe}</p>
            <p>HP: {p.hp}/{p.maxHp}</p>
            {p.id === socket.id && estado.turno === 'SQUAD' && !p.foiSuaVez && (
              <button 
                onClick={() => socket.emit('atacar')}
                className="mt-4 bg-orange-500 hover:bg-orange-600 w-full py-2 rounded font-bold"
              >
                ATACAR!
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}