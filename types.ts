// types.ts
export type ClasseNome = 'Guerreiro' | 'Mago' | 'Arqueiro';

export interface Jogador {
  id: string;
  nome: string;
  classe: ClasseNome;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  ataque: number;
  nivel: number;
  xp: number;
  foiSuaVez: boolean;
}

export interface Monstro {
  nome: string;
  hp: number;
  maxHp: number;
  ataque: number;
  nivel: number;
}

export interface EstadoJogo {
  jogadores: Record<string, Jogador>;
  monstro: Monstro;
  turno: 'SQUAD' | 'MONSTRO';
}