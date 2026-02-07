import type { Inventory } from '@/types';
import { getItem } from '@/data/items';

/**
 * Shop item med pris
 */
export interface ShopItem {
  itemId: string;
  price: number;
  stock?: number; // Hvis undefined = uendelig
}

/**
 * Shop definition
 */
export interface Shop {
  id: string;
  name: string;
  items: ShopItem[];
}

/**
 * ShopSystem - Håndterer køb og salg af items
 */
export class ShopSystem {
  /**
   * Køb et item fra shoppen
   *
   * @returns true hvis købet lykkedes, false hvis ikke nok guld eller inventory fuld
   */
  static buyItem(
    inventory: Inventory,
    gold: number,
    shopItem: ShopItem
  ): { success: boolean; gold: number; message: string } {
    const item = getItem(shopItem.itemId);

    if (!item) {
      return { success: false, gold, message: `Item ikke fundet: ${shopItem.itemId}` };
    }

    // Check om spilleren har nok guld
    if (gold < shopItem.price) {
      return { success: false, gold, message: `Ikke nok guld! Koster ${shopItem.price}g.` };
    }

    // Check om inventory er fuld
    if (inventory.items.length >= inventory.maxSlots) {
      // Tjek om item allerede findes (kan stackes)
      const existing = inventory.items.find(i => i.item.id === shopItem.itemId);
      if (!existing) {
        return { success: false, gold, message: 'Inventory er fuld!' };
      }
    }

    // Tilføj item til inventory
    const existingItem = inventory.items.find(i => i.item.id === shopItem.itemId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      inventory.items.push({ item, quantity: 1 });
    }

    // Træk guld
    const newGold = gold - shopItem.price;

    return {
      success: true,
      gold: newGold,
      message: `Købte ${item.name} for ${shopItem.price}g.`
    };
  }

  /**
   * Sælg et item til shoppen (50% af købspris)
   *
   * @returns nyt guld-beløb
   */
  static sellItem(
    inventory: Inventory,
    gold: number,
    itemId: string,
    sellPrice: number
  ): { success: boolean; gold: number; message: string } {
    const item = getItem(itemId);

    if (!item) {
      return { success: false, gold, message: 'Item ikke fundet!' };
    }

    // Check om spilleren har itemet
    const existingItem = inventory.items.find(i => i.item.id === itemId);
    if (!existingItem || existingItem.quantity <= 0) {
      return { success: false, gold, message: 'Du har ikke dette item!' };
    }

    // Fjern item
    existingItem.quantity -= 1;
    if (existingItem.quantity <= 0) {
      inventory.items = inventory.items.filter(i => i.item.id !== itemId);
    }

    // Tilføj guld
    const newGold = gold + sellPrice;

    return {
      success: true,
      gold: newGold,
      message: `Solgte ${item.name} for ${sellPrice}g.`
    };
  }
}
