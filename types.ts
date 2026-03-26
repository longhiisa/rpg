export type ClasseNome = 'Guerreiro' | 'Mago' | 'Arqueiro';

export interface MensagemChat {
  id: string; autor: string; texto: string; cor: string;
}

// NOVA INTERFACE DE ITEM
export interface Item {
  id: string; nome: string; tipo: 'ataque' | 'defesa' | 'vida'; valor: number; preco: number; icone: string;
}

export interface Jogador {
  id: string; nome: string; classe: ClasseNome;
  hp: number; maxHp: number; mana: number; maxMana: number;
  ataque: number; defesa: number; // Defesa adicionada
  nivel: number; xp: number;
  foiSuaVez: boolean; estaDefendendo: boolean;
  inventario: Item[]; // Inventário in-memory
}

export interface Monstro {
  nome: string; hp: number; maxHp: number; ataque: number; nivel: number;
}

export interface EstadoJogo {
  jogadores: Record<string, Jogador>;
  monstro: Monstro;
  turno: 'SQUAD' | 'MONSTRO';
  moedas: number; // Moedas do Squad
}