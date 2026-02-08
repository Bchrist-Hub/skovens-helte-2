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
      { itemId: 'healing_potion', price: 30 },
      { itemId: 'large_healing_potion', price: 80 },
      { itemId: 'mana_potion', price: 40 }
    ]
  },

  blacksmith_shop: {
    id: 'blacksmith_shop',
    name: 'Smedens Værksted',
    items: [
      // Weapons (better selection than village shop)
      { itemId: 'wooden_sword', price: 50 },
      { itemId: 'iron_sword', price: 200 },
      { itemId: 'magic_sword', price: 800, stock: 1 },

      // Armor (better selection than village shop)
      { itemId: 'leather_armor', price: 50 },
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
