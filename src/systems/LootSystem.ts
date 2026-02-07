import type { Monster } from '@/types';

/**
 * LootSystem - Genererer loot fra besejrede monstre
 */

export interface LootDrop {
  itemId: string;
  quantity: number;
}

export class LootSystem {
  /**
   * Generer loot fra en liste af besejrede monstre
   */
  static generateLoot(defeatedEnemies: Monster[]): LootDrop[] {
    const loot: LootDrop[] = [];

    defeatedEnemies.forEach(enemy => {
      enemy.loot.forEach(lootEntry => {
        // Roll for drop chance
        if (Math.random() < lootEntry.chance) {
          // Check if we already have this item in loot
          const existing = loot.find(l => l.itemId === lootEntry.itemId);

          if (existing) {
            existing.quantity++;
          } else {
            loot.push({
              itemId: lootEntry.itemId,
              quantity: 1
            });
          }
        }
      });
    });

    return loot;
  }

  /**
   * Beregn total XP fra besejrede monstre
   */
  static calculateTotalXP(defeatedEnemies: Monster[]): number {
    return defeatedEnemies.reduce((total, enemy) => total + enemy.xpReward, 0);
  }

  /**
   * Beregn total guld fra besejrede monstre
   */
  static calculateTotalGold(defeatedEnemies: Monster[]): number {
    return defeatedEnemies.reduce((total, enemy) => total + enemy.goldReward, 0);
  }
}
