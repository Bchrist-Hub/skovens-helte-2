// ============================================================================
// Core Type Definitions
// ============================================================================

export interface Player {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  baseStats: {
    maxHP: number;
    maxMP: number;
    atk: number;
    def: number;
  };
  currentHP: number;
  currentMP: number;
  equipment: {
    weapon: Item | null;
    armor: Item | null;
  };
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable';
  description: string;
  stats?: {
    atk?: number;
    def?: number;
  };
  effect?: {
    type: 'heal_hp' | 'heal_mp';
    value: number;
  };
}

export interface Inventory {
  items: Array<{ item: Item; quantity: number }>;
  maxSlots: number;
}

export interface Monster {
  id: string;
  name: string;
  sprite: string;
  stats: {
    maxHP: number;
    atk: number;
    def: number;
  };
  currentHP: number;
  xpReward: number;
  loot: Array<{ itemId: string; chance: number }>;
  actions: Array<{ type: string; weight: number }>;
  aiType: 'basic' | 'aggressive' | 'boss';
  hasHealed?: boolean; // Tracker om boss har healet sig selv
}

export interface EventFlags {
  [key: string]: boolean;
}

export interface GameState {
  player: Player;
  inventory: Inventory;
  eventFlags: EventFlags;
  currentMap: string;
  playerPosition: { x: number; y: number };
  playTime: number;
  encounterSteps: number;
  gold: number; // Spillerens guld
}

export interface CombatEvent {
  actor: string;
  action: string;
  target: string;
  hit: boolean;
  damage: number;
  healing: number;
  mpCost: number;
  resultingHP: number;
  message: string;
  combatEnded: boolean;
  combatResult: 'victory' | 'defeat' | null;
}

export interface DialogEntry {
  id: string;
  speaker: string;
  lines: string[];
  condition?: string;
  setsFlag?: string;
  next?: string;
}

export interface MapTrigger {
  tileX: number;
  tileY: number;
  type: 'dialog' | 'transition' | 'event' | 'shop';
  condition?: string;
  payload: string;
}

// Input system types
export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;  // Enter/Space
  cancel: boolean;  // Escape
  menu: boolean;    // ESC or other menu key
}

export type Direction = 'up' | 'down' | 'left' | 'right';
