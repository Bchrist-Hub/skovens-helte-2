import type { Inventory, Player } from '@/types';
import { getItem } from '@/data/items';

/**
 * InventorySystem - Håndterer inventory management
 */
export class InventorySystem {
  /**
   * Tilføj item til inventory
   */
  static addItem(inventory: Inventory, itemId: string, quantity: number = 1): boolean {
    // Find existing stack
    const existing = inventory.items.find(i => i.item.id === itemId);

    if (existing) {
      existing.quantity += quantity;
      return true;
    }

    // Check hvis inventory er fuld
    if (inventory.items.length >= inventory.maxSlots) {
      console.warn('Inventory is full!');
      return false;
    }

    // Tilføj nyt item
    const item = getItem(itemId);
    if (!item) {
      console.error(`Item not found: ${itemId}`);
      return false;
    }

    inventory.items.push({ item, quantity });
    return true;
  }

  /**
   * Fjern item fra inventory
   */
  static removeItem(inventory: Inventory, itemId: string, quantity: number = 1): boolean {
    const existing = inventory.items.find(i => i.item.id === itemId);

    if (!existing || existing.quantity < quantity) {
      return false;
    }

    existing.quantity -= quantity;

    // Fjern helt hvis quantity er 0
    if (existing.quantity <= 0) {
      inventory.items = inventory.items.filter(i => i.item.id !== itemId);
    }

    return true;
  }

  /**
   * Tjek om inventory har et item
   */
  static hasItem(inventory: Inventory, itemId: string, quantity: number = 1): boolean {
    const existing = inventory.items.find(i => i.item.id === itemId);
    return existing ? existing.quantity >= quantity : false;
  }

  /**
   * Få quantity af et item
   */
  static getItemQuantity(inventory: Inventory, itemId: string): number {
    const existing = inventory.items.find(i => i.item.id === itemId);
    return existing ? existing.quantity : 0;
  }

  /**
   * Brug et consumable item
   */
  static useConsumable(inventory: Inventory, player: Player, itemId: string): boolean {
    const item = getItem(itemId);

    if (!item || item.type !== 'consumable' || !item.effect) {
      return false;
    }

    // Check om vi har item
    if (!this.hasItem(inventory, itemId)) {
      return false;
    }

    // Anvend effekt
    switch (item.effect.type) {
      case 'heal_hp':
        const hpHealed = Math.min(item.effect.value, player.baseStats.maxHP - player.currentHP);
        player.currentHP += hpHealed;
        break;

      case 'heal_mp':
        const mpRestored = Math.min(item.effect.value, player.baseStats.maxMP - player.currentMP);
        player.currentMP += mpRestored;
        break;
    }

    // Fjern item fra inventory
    this.removeItem(inventory, itemId, 1);

    return true;
  }

  /**
   * Equip våben eller rustning
   */
  static equipItem(inventory: Inventory, player: Player, itemId: string): boolean {
    const item = getItem(itemId);

    if (!item || (item.type !== 'weapon' && item.type !== 'armor' && item.type !== 'shield')) {
      return false;
    }

    // Check om vi har item
    if (!this.hasItem(inventory, itemId)) {
      return false;
    }

    // Unequip current item hvis der er et
    if (item.type === 'weapon' && player.equipment.weapon) {
      this.addItem(inventory, player.equipment.weapon.id, 1);
    } else if (item.type === 'armor' && player.equipment.armor) {
      this.addItem(inventory, player.equipment.armor.id, 1);
    } else if (item.type === 'shield' && player.equipment.shield) {
      this.addItem(inventory, player.equipment.shield.id, 1);
    }

    // Equip nyt item
    if (item.type === 'weapon') {
      player.equipment.weapon = item;
    } else if (item.type === 'armor') {
      player.equipment.armor = item;
    } else {
      player.equipment.shield = item;
    }

    // Fjern fra inventory
    this.removeItem(inventory, itemId, 1);

    return true;
  }

  /**
   * Unequip våben, rustning, eller skjold
   */
  static unequipItem(inventory: Inventory, player: Player, slot: 'weapon' | 'armor' | 'shield'): boolean {
    const equippedItem = player.equipment[slot];

    if (!equippedItem) {
      return false;
    }

    // Tilføj tilbage til inventory
    if (!this.addItem(inventory, equippedItem.id, 1)) {
      console.warn('Cannot unequip: inventory full');
      return false;
    }

    // Fjern fra equipment
    player.equipment[slot] = null;

    return true;
  }

  /**
   * Få total ATK (base + weapon)
   */
  static getTotalAtk(player: Player): number {
    let total = player.baseStats.atk;

    if (player.equipment.weapon?.stats?.atk) {
      total += player.equipment.weapon.stats.atk;
    }

    return total;
  }

  /**
   * Få total DEF (base + armor + shield)
   */
  static getTotalDef(player: Player): number {
    let total = player.baseStats.def;

    if (player.equipment.armor?.stats?.def) {
      total += player.equipment.armor.stats.def;
    }

    if (player.equipment.shield?.stats?.def) {
      total += player.equipment.shield.stats.def;
    }

    return total;
  }
}
