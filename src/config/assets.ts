/**
 * Asset Configuration
 *
 * Centralized asset management for easy asset pack swapping.
 * To use a different asset pack, update ASSET_BASE_PATH and sprite mappings.
 */

// Base path for current asset pack (relative to public/)
const ASSET_BASE_PATH = 'assets/Cute_Fantasy_Free';

/**
 * Sprite sheet configurations
 */
export interface SpriteConfig {
  key: string;
  path: string;
  frameWidth?: number;
  frameHeight?: number;
}

export interface ImageConfig {
  key: string;
  path: string;
}

/**
 * Player sprite configuration
 * Player sprites are 96x160 pixels per frame (192x320 total = 2 columns x 2 rows)
 * Each frame shows a complete character pose
 */
export const PLAYER_SPRITES: SpriteConfig[] = [
  {
    key: 'player',
    path: `${ASSET_BASE_PATH}/Player/Player.png`,
    frameWidth: 96,
    frameHeight: 160
  },
  {
    key: 'player_actions',
    path: `${ASSET_BASE_PATH}/Player/Player_Actions.png`,
    frameWidth: 96,
    frameHeight: 160
  }
];

/**
 * Monster sprite configurations
 * Slime: 512x192 = 128x96 frames (4 columns x 2 rows)
 * Skeleton: 192x320 = 96x160 frames (2 columns x 2 rows), same as player
 */
export const MONSTER_SPRITES: SpriteConfig[] = [
  {
    key: 'slime_green',
    path: `${ASSET_BASE_PATH}/Enemies/Slime_Green.png`,
    frameWidth: 128,
    frameHeight: 96
  },
  {
    key: 'skeleton',
    path: `${ASSET_BASE_PATH}/Enemies/Skeleton.png`,
    frameWidth: 96,
    frameHeight: 160
  }
];

/**
 * Tile sprite configurations
 */
export const TILE_SPRITES: ImageConfig[] = [
  {
    key: 'grass_tile',
    path: `${ASSET_BASE_PATH}/Tiles/Grass_Middle.png`
  },
  {
    key: 'path_tile',
    path: `${ASSET_BASE_PATH}/Tiles/Path_Middle.png`
  },
  {
    key: 'water_tile',
    path: `${ASSET_BASE_PATH}/Tiles/Water_Middle.png`
  },
  {
    key: 'cliff_tile',
    path: `${ASSET_BASE_PATH}/Tiles/Cliff_Tile.png`
  }
];

/**
 * Decoration sprite configurations
 */
export const DECORATION_SPRITES: ImageConfig[] = [
  {
    key: 'oak_tree',
    path: `${ASSET_BASE_PATH}/Outdoor decoration/Oak_Tree.png`
  },
  {
    key: 'oak_tree_small',
    path: `${ASSET_BASE_PATH}/Outdoor decoration/Oak_Tree_Small.png`
  },
  {
    key: 'house_wood',
    path: `${ASSET_BASE_PATH}/Outdoor decoration/House_1_Wood_Base_Blue.png`
  },
  {
    key: 'chest',
    path: `${ASSET_BASE_PATH}/Outdoor decoration/Chest.png`
  }
];

/**
 * Monster ID to Sprite Key mapping
 * Maps game monster IDs to their sprite keys
 */
export const MONSTER_SPRITE_MAP: Record<string, string> = {
  slime: 'slime_green',
  wolf: 'skeleton',      // Using skeleton sprite for wolf
  goblin: 'skeleton',    // Using skeleton sprite for goblin
  bat: 'skeleton',       // Using skeleton sprite for bat
  stone_golem: 'skeleton', // Using skeleton sprite for golem
  red_dragon: 'skeleton'   // Using skeleton sprite for dragon (will be tinted red)
};

/**
 * Animation configurations
 */
export interface AnimConfig {
  key: string;
  spriteKey: string;
  frames: number[];
  frameRate: number;
  repeat: number;
}

/**
 * Player animations
 * With 96x160 frames (2 columns x 2 rows = 4 total frames)
 * Using simple 2-frame animations for walk cycles
 */
export const PLAYER_ANIMS: AnimConfig[] = [
  {
    key: 'player_idle_down',
    spriteKey: 'player',
    frames: [0],
    frameRate: 1,
    repeat: -1
  },
  {
    key: 'player_walk_down',
    spriteKey: 'player',
    frames: [0, 1],
    frameRate: 6,
    repeat: -1
  },
  {
    key: 'player_idle_up',
    spriteKey: 'player',
    frames: [2],
    frameRate: 1,
    repeat: -1
  },
  {
    key: 'player_walk_up',
    spriteKey: 'player',
    frames: [2, 3],
    frameRate: 6,
    repeat: -1
  },
  {
    key: 'player_idle_right',
    spriteKey: 'player',
    frames: [1],
    frameRate: 1,
    repeat: -1
  },
  {
    key: 'player_walk_right',
    spriteKey: 'player',
    frames: [1, 0],
    frameRate: 6,
    repeat: -1
  },
  {
    key: 'player_idle_left',
    spriteKey: 'player',
    frames: [3],
    frameRate: 1,
    repeat: -1
  },
  {
    key: 'player_walk_left',
    spriteKey: 'player',
    frames: [3, 2],
    frameRate: 6,
    repeat: -1
  }
];

/**
 * Monster animations
 */
export const MONSTER_ANIMS: AnimConfig[] = [
  {
    key: 'slime_idle',
    spriteKey: 'slime_green',
    frames: [0, 1, 2, 3],
    frameRate: 4,
    repeat: -1
  },
  {
    key: 'skeleton_idle',
    spriteKey: 'skeleton',
    frames: [0, 1, 2, 3],
    frameRate: 4,
    repeat: -1
  }
];

/**
 * Get sprite key for a monster ID
 */
export function getMonsterSpriteKey(monsterId: string): string {
  return MONSTER_SPRITE_MAP[monsterId] || 'skeleton';
}

/**
 * Get animation key for a monster ID
 */
export function getMonsterAnimKey(monsterId: string): string {
  const spriteKey = getMonsterSpriteKey(monsterId);

  if (spriteKey === 'slime_green') {
    return 'slime_idle';
  }

  return 'skeleton_idle';
}

/**
 * Get tint color for specific monsters
 */
export function getMonsterTint(monsterId: string): number | undefined {
  const tints: Record<string, number> = {
    red_dragon: 0xff0000,  // Red tint for dragon
    bat: 0x8b4513,         // Brown tint for bat
    stone_golem: 0x808080  // Gray tint for golem
  };

  return tints[monsterId];
}

/**
 * All sprite configurations combined
 */
export const ALL_SPRITES = {
  player: PLAYER_SPRITES,
  monsters: MONSTER_SPRITES,
  tiles: TILE_SPRITES,
  decorations: DECORATION_SPRITES
};

/**
 * All animation configurations combined
 */
export const ALL_ANIMS = {
  player: PLAYER_ANIMS,
  monsters: MONSTER_ANIMS
};
