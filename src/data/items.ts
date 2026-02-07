import type { Item } from '@/types';

/**
 * Items database
 *
 * Alle items i spillet organiseret efter type
 */

export const ITEMS: Record<string, Item> = {
  // ============================================================================
  // VÅBEN
  // ============================================================================

  wooden_sword: {
    id: 'wooden_sword',
    name: 'Træsværd',
    type: 'weapon',
    description: 'Et simpelt træsværd. Bedre end ingenting.',
    stats: {
      atk: 3
    }
  },

  iron_sword: {
    id: 'iron_sword',
    name: 'Jernsværd',
    type: 'weapon',
    description: 'Et solidt sværd af jern. Bruges af erfarne krigere.',
    stats: {
      atk: 7
    }
  },

  magic_sword: {
    id: 'magic_sword',
    name: 'Magisværd',
    type: 'weapon',
    description: 'Et sværd fortryllet med ældgammel magi.',
    stats: {
      atk: 12
    }
  },

  // ============================================================================
  // RUSTNING
  // ============================================================================

  leather_armor: {
    id: 'leather_armor',
    name: 'Læderrustning',
    type: 'armor',
    description: 'Let rustning af hærdet læder.',
    stats: {
      def: 3
    }
  },

  chainmail: {
    id: 'chainmail',
    name: 'Ringbrynje',
    type: 'armor',
    description: 'Rustning af sammenflettede jernringe.',
    stats: {
      def: 7
    }
  },

  dragon_scale_armor: {
    id: 'dragon_scale_armor',
    name: 'Drageskaelrustning',
    type: 'armor',
    description: 'Rustning lavet af drageskaæl. Utrolig beskyttelse.',
    stats: {
      def: 12
    }
  },

  // ============================================================================
  // CONSUMABLES
  // ============================================================================

  healing_potion: {
    id: 'healing_potion',
    name: 'Helbredelsesdrik',
    type: 'consumable',
    description: 'Gendan 30 HP.',
    effect: {
      type: 'heal_hp',
      value: 30
    }
  },

  large_healing_potion: {
    id: 'large_healing_potion',
    name: 'Stor Helbredelsesdrik',
    type: 'consumable',
    description: 'Gendan 80 HP.',
    effect: {
      type: 'heal_hp',
      value: 80
    }
  },

  mana_potion: {
    id: 'mana_potion',
    name: 'Manadrik',
    type: 'consumable',
    description: 'Gendan 20 MP.',
    effect: {
      type: 'heal_mp',
      value: 20
    }
  }
};

/**
 * Få et item via ID
 */
export function getItem(itemId: string): Item | null {
  return ITEMS[itemId] || null;
}

/**
 * Få alle items af en specifik type
 */
export function getItemsByType(type: 'weapon' | 'armor' | 'consumable'): Item[] {
  return Object.values(ITEMS).filter(item => item.type === type);
}

/**
 * Starter-udstyr som spilleren får
 */
export const STARTER_ITEMS = [
  { itemId: 'wooden_sword', quantity: 1 },
  { itemId: 'leather_armor', quantity: 1 },
  { itemId: 'healing_potion', quantity: 3 }
];
