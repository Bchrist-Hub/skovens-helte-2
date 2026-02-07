import type { Monster } from '@/types';

/**
 * Monster database
 *
 * Alle monstre i spillet med deres stats, AI-type, XP-rewards og loot
 */

export const MONSTERS: Record<string, Omit<Monster, 'currentHP'>> = {
  // ============================================================================
  // SKOV NORD - Begynder monstre
  // ============================================================================

  slime: {
    id: 'slime',
    name: 'Slim',
    sprite: 'monster_slime', // TODO: Lav sprite
    stats: {
      maxHP: 15,
      atk: 5,
      def: 2
    },
    xpReward: 5,
    goldReward: 5,
    loot: [
      { itemId: 'healing_potion', chance: 0.3 }
    ],
    actions: [
      { type: 'attack', weight: 1.0 }
    ],
    aiType: 'basic'
  },

  wolf: {
    id: 'wolf',
    name: 'Ulv',
    sprite: 'monster_wolf',
    stats: {
      maxHP: 25,
      atk: 9,
      def: 3
    },
    xpReward: 10,
    goldReward: 10,
    loot: [
      { itemId: 'healing_potion', chance: 0.4 }
    ],
    actions: [
      { type: 'attack', weight: 1.0 }
    ],
    aiType: 'aggressive'
  },

  // ============================================================================
  // SKOV SYD - Medium monstre
  // ============================================================================

  goblin: {
    id: 'goblin',
    name: 'Goblin',
    sprite: 'monster_goblin',
    stats: {
      maxHP: 30,
      atk: 11,
      def: 5
    },
    xpReward: 15,
    goldReward: 15,
    loot: [
      { itemId: 'healing_potion', chance: 0.5 },
      { itemId: 'iron_sword', chance: 0.1 }
    ],
    actions: [
      { type: 'attack', weight: 1.0 }
    ],
    aiType: 'aggressive'
  },

  // ============================================================================
  // BJERG - Hårde monstre
  // ============================================================================

  bat: {
    id: 'bat',
    name: 'Flagermus',
    sprite: 'monster_bat',
    stats: {
      maxHP: 18,
      atk: 8,
      def: 2
    },
    xpReward: 8,
    goldReward: 8,
    loot: [
      { itemId: 'mana_potion', chance: 0.4 }
    ],
    actions: [
      { type: 'attack', weight: 1.0 }
    ],
    aiType: 'basic'
  },

  stone_golem: {
    id: 'stone_golem',
    name: 'Stengolem',
    sprite: 'monster_golem',
    stats: {
      maxHP: 50,
      atk: 14,
      def: 12
    },
    xpReward: 25,
    goldReward: 25,
    loot: [
      { itemId: 'large_healing_potion', chance: 0.6 },
      { itemId: 'chainmail', chance: 0.15 }
    ],
    actions: [
      { type: 'attack', weight: 1.0 }
    ],
    aiType: 'basic'
  },

  // ============================================================================
  // BOSS
  // ============================================================================

  red_dragon: {
    id: 'red_dragon',
    name: 'Rød Drage',
    sprite: 'monster_dragon',
    stats: {
      maxHP: 200,
      atk: 22,
      def: 15
    },
    xpReward: 0, // Boss giver ingen XP (spillet slutter)
    goldReward: 0, // Dragon giver 500g bonus i CombatScene
    loot: [],
    actions: [
      { type: 'attack', weight: 0.6 },
      { type: 'fire_breath', weight: 0.4 }
    ],
    aiType: 'boss'
  }
};

/**
 * Skab en monster-instans fra template
 */
export function createMonster(monsterId: string): Monster {
  const template = MONSTERS[monsterId];

  if (!template) {
    throw new Error(`Monster not found: ${monsterId}`);
  }

  return {
    ...template,
    currentHP: template.stats.maxHP
  };
}

/**
 * Encounter tables - definerer hvilke monstre der spawner hvor
 */
export interface EncounterTable {
  monsters: Array<{
    id: string;
    weight: number;
    minLevel?: number;
    maxLevel?: number;
  }>;
  minEncounters: number;  // Min antal monstre per kamp
  maxEncounters: number;  // Max antal monstre per kamp
}

export const ENCOUNTER_TABLES: Record<string, EncounterTable> = {
  forest_north: {
    monsters: [
      { id: 'slime', weight: 0.6 },
      { id: 'wolf', weight: 0.4 }
    ],
    minEncounters: 1,
    maxEncounters: 2
  },

  forest_south: {
    monsters: [
      { id: 'wolf', weight: 0.5 },
      { id: 'goblin', weight: 0.5 }
    ],
    minEncounters: 1,
    maxEncounters: 2
  },

  mountain: {
    monsters: [
      { id: 'bat', weight: 0.4 },
      { id: 'stone_golem', weight: 0.6 }
    ],
    minEncounters: 1,
    maxEncounters: 2
  }
};

/**
 * Generer en tilfældig encounter fra en tabel
 */
export function generateEncounter(tableId: string): Monster[] {
  const table = ENCOUNTER_TABLES[tableId];

  if (!table) {
    throw new Error(`Encounter table not found: ${tableId}`);
  }

  // Bestem antal monstre
  const count = Math.floor(
    Math.random() * (table.maxEncounters - table.minEncounters + 1) + table.minEncounters
  );

  const monsters: Monster[] = [];

  for (let i = 0; i < count; i++) {
    // Weighted random selection
    const totalWeight = table.monsters.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of table.monsters) {
      random -= entry.weight;
      if (random <= 0) {
        monsters.push(createMonster(entry.id));
        break;
      }
    }
  }

  return monsters;
}
