import type { Shop } from '@/systems/ShopSystem';

/**
 * Shop definitions
 *
 * Alle shops i spillet med deres inventory og priser
 */
export const SHOPS: Record<string, Shop> = {
  village_shop: {
    id: 'village_shop',
    name: 'Landsby Købmand',
    items: [
      // Consumables
      { itemId: 'small_healing_potion', price: 15 },
      { itemId: 'healing_potion', price: 30 },
      { itemId: 'large_healing_potion', price: 60 },
      { itemId: 'mana_potion', price: 40 }
    ]
  },

  blacksmith_shop: {
    id: 'blacksmith_shop',
    name: 'Smedens Værksted',
    items: [
      // --- VÅBEN ---
      { itemId: 'wooden_sword', price: 50 },
      { itemId: 'bow', price: 80 },
      { itemId: 'axe', price: 90 },
      { itemId: 'iron_sword', price: 200 },
      { itemId: 'magic_sword', price: 800, stock: 1 },

      // --- RUSTNING & SKJOLDE ---
      { itemId: 'wooden_shield', price: 40 },
      { itemId: 'leather_armor', price: 50 },
      { itemId: 'iron_shield', price: 120 },
      { itemId: 'chainmail', price: 200 },
      { itemId: 'dragon_scale_armor', price: 1000, stock: 1 }
    ]
  }
};

/**
 * Få en shop fra ID
 */
export function getShop(shopId: string): Shop | undefined {
  return SHOPS[shopId];
}
