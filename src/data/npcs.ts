import type { NPC } from '@/types';

/**
 * NPC definitions for each map
 *
 * NPCs kan have dialog, shops, eller quests
 */

// ============================================================================
// Village NPCs (Outdoor)
// ============================================================================
export const VILLAGE_NPCS: NPC[] = [
  {
    id: 'villager_woman',
    name: 'Landsbykvinde',
    sprite: 'npc_woman',
    tileX: 5,
    tileY: 10,
    dialog: 'villager_woman_greeting',
    facingDirection: 'right'
  },
  {
    id: 'worried_man',
    name: 'Bekymret Mand',
    sprite: 'npc_man',
    tileX: 10,
    tileY: 12,
    dialog: 'worried_man_greeting',
    facingDirection: 'left'
  }
];

// ============================================================================
// House Interior NPCs
// ============================================================================
export const HOUSE_INTERIOR_NPCS: NPC[] = [
  {
    id: 'shopkeeper_interior',
    name: 'Købmand',
    sprite: 'npc_merchant',
    tileX: 5,
    tileY: 5,
    dialog: 'shopkeeper_greeting',
    shopId: 'village_shop',
    facingDirection: 'down'
  }
];

// ============================================================================
// Inn Interior NPCs
// ============================================================================
export const INN_INTERIOR_NPCS: NPC[] = [
  {
    id: 'innkeeper',
    name: 'Kromand',
    sprite: 'npc_merchant',
    tileX: 10,
    tileY: 5,
    dialog: 'innkeeper_greeting',
    facingDirection: 'down'
  }
];

// ============================================================================
// Blacksmith Interior NPCs
// ============================================================================
export const BLACKSMITH_INTERIOR_NPCS: NPC[] = [
  {
    id: 'blacksmith',
    name: 'Smed',
    sprite: 'npc_merchant',
    tileX: 10,
    tileY: 7,
    dialog: 'blacksmith_greeting',
    shopId: 'blacksmith_shop',
    facingDirection: 'down'
  }
];

// ============================================================================
// Elder's House Interior NPCs
// ============================================================================
export const ELDER_HOUSE_INTERIOR_NPCS: NPC[] = [
  {
    id: 'elder_interior',
    name: 'Landsby Ældste',
    sprite: 'npc_elder',
    tileX: 7,
    tileY: 5,
    dialog: 'elder_greeting',
    facingDirection: 'down'
  }
];

/**
 * Få NPCs for en given map
 */
export function getNPCsForMap(mapName: string): NPC[] {
  switch (mapName) {
    case 'village':
      return VILLAGE_NPCS;
    case 'house_interior':
      return HOUSE_INTERIOR_NPCS;
    case 'inn_interior':
      return INN_INTERIOR_NPCS;
    case 'blacksmith_interior':
      return BLACKSMITH_INTERIOR_NPCS;
    case 'elder_house_interior':
      return ELDER_HOUSE_INTERIOR_NPCS;
    default:
      return [];
  }
}

/**
 * Find en specifik NPC ved ID
 */
export function getNPCById(npcId: string): NPC | undefined {
  const allNPCs = [
    ...VILLAGE_NPCS,
    ...HOUSE_INTERIOR_NPCS,
    ...INN_INTERIOR_NPCS,
    ...BLACKSMITH_INTERIOR_NPCS,
    ...ELDER_HOUSE_INTERIOR_NPCS
  ];
  return allNPCs.find(npc => npc.id === npcId);
}
