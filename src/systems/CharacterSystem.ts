import type { Player } from '@/types';

/**
 * CharacterSystem - Håndterer XP, levels og stat-stigninger
 */

// Level-up tabel (fra implementeringsplanen)
const LEVEL_TABLE = [
  { level: 1, xpRequired: 0, maxHP: 40, maxMP: 15, atk: 8, def: 4 },
  { level: 2, xpRequired: 20, maxHP: 48, maxMP: 18, atk: 10, def: 5 },
  { level: 3, xpRequired: 50, maxHP: 56, maxMP: 21, atk: 12, def: 6 },
  { level: 4, xpRequired: 100, maxHP: 64, maxMP: 24, atk: 14, def: 7 },
  { level: 5, xpRequired: 170, maxHP: 72, maxMP: 27, atk: 16, def: 8 },
  { level: 6, xpRequired: 260, maxHP: 80, maxMP: 30, atk: 18, def: 9 },
  { level: 7, xpRequired: 380, maxHP: 88, maxMP: 33, atk: 20, def: 10 },
  { level: 8, xpRequired: 530, maxHP: 96, maxMP: 36, atk: 22, def: 11 },
  { level: 9, xpRequired: 720, maxHP: 104, maxMP: 39, atk: 24, def: 12 },
  { level: 10, xpRequired: 950, maxHP: 112, maxMP: 42, atk: 26, def: 13 }
];

export interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  statGains: {
    maxHP: number;
    maxMP: number;
    atk: number;
    def: number;
  };
}

export class CharacterSystem {
  /**
   * Tilføj XP til spilleren og check for level-up
   */
  static addXP(player: Player, amount: number): LevelUpResult {
    player.xp += amount;

    // Check for level-up
    const nextLevelData = LEVEL_TABLE[player.level]; // player.level er 0-indexed, så dette er næste level

    if (!nextLevelData) {
      // Max level nået
      return {
        leveledUp: false,
        newLevel: player.level,
        statGains: { maxHP: 0, maxMP: 0, atk: 0, def: 0 }
      };
    }

    if (player.xp >= nextLevelData.xpRequired) {
      return this.levelUp(player);
    }

    // Opdater xpToNext
    player.xpToNext = nextLevelData.xpRequired;

    return {
      leveledUp: false,
      newLevel: player.level,
      statGains: { maxHP: 0, maxMP: 0, atk: 0, def: 0 }
    };
  }

  /**
   * Level up spilleren
   */
  private static levelUp(player: Player): LevelUpResult {
    const oldLevel = player.level;
    player.level++;

    const oldStats = LEVEL_TABLE[oldLevel - 1];
    const newStats = LEVEL_TABLE[player.level - 1];

    if (!newStats) {
      // Skulle ikke ske, men failsafe
      player.level = oldLevel;
      return {
        leveledUp: false,
        newLevel: player.level,
        statGains: { maxHP: 0, maxMP: 0, atk: 0, def: 0 }
      };
    }

    // Beregn stat gains
    const statGains = {
      maxHP: newStats.maxHP - oldStats.maxHP,
      maxMP: newStats.maxMP - oldStats.maxMP,
      atk: newStats.atk - oldStats.atk,
      def: newStats.def - oldStats.def
    };

    // Opdater base stats
    player.baseStats.maxHP = newStats.maxHP;
    player.baseStats.maxMP = newStats.maxMP;
    player.baseStats.atk = newStats.atk;
    player.baseStats.def = newStats.def;

    // Full heal ved level-up
    player.currentHP = player.baseStats.maxHP;
    player.currentMP = player.baseStats.maxMP;

    // Opdater xpToNext
    const nextLevelData = LEVEL_TABLE[player.level];
    player.xpToNext = nextLevelData ? nextLevelData.xpRequired : player.xp;

    console.log(`Level up! ${oldLevel} → ${player.level}`);
    console.log('Stat gains:', statGains);

    return {
      leveledUp: true,
      newLevel: player.level,
      statGains
    };
  }

  /**
   * Få XP til næste level
   */
  static getXPToNextLevel(player: Player): number {
    const nextLevelData = LEVEL_TABLE[player.level];
    if (!nextLevelData) {
      return 0; // Max level
    }
    return nextLevelData.xpRequired - player.xp;
  }

  /**
   * Få level data for et specifikt level
   */
  static getLevelData(level: number) {
    return LEVEL_TABLE[level - 1];
  }
}
