// types.ts
export type ClasseNome = 'Guerreiro' | 'Mago' | 'Arqueiro';

export interface Jogador {
  id: string;
  nome: string;
  classe: ClasseNome;
  hp: number;
  maxHp: number;
  ataque: number;
  nivel: number;
  xp: number;
  foiSuaVez: boolean;
}

export interface EstadoJogo {
  jogadores: Record<string, Jogador>;
  monstro: {
    nome: string;
    hp: number;
    maxHp: number;
    ataque: number;
    nivel: number; // <--- O "culpado" era a falta dessa linha!
  };
  turno: 'SQUAD' | 'MONSTRO';
}