import type { NPC } from '@/types';

/**
 * NPC definitions for each map
 *
 * NPCs kan have dialog, shops, eller quests
 */
export const VILLAGE_NPCS: NPC[] = [
  {
    id: 'village_elder',
    name: 'Landsby Ældste',
    sprite: 'npc_elder',
    tileX: 8,
    tileY: 5,
    dialog: 'elder_greeting',
    facingDirection: 'down'
  },
  {
    id: 'shopkeeper',
    name: 'Købmand',
    sprite: 'npc_merchant',
    tileX: 12,
    tileY: 7,
    dialog: 'shopkeeper_greeting',
    shopId: 'village_shop',
    facingDirection: 'down'
  },
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
  },
  {
    id: 'guard',
    name: 'Vagt',
    sprite: 'npc_guard',
    tileX: 8,
    tileY: 15,
    dialog: 'guard_greeting',
    facingDirection: 'up',
    condition: '!dragon_defeated' // Forsvinder når dragon er besejret
  },
  {
    id: 'guard_victory',
    name: 'Vagt',
    sprite: 'npc_guard',
    tileX: 8,
    tileY: 15,
    dialog: 'guard_victory',
    facingDirection: 'up',
    condition: 'dragon_defeated' // Vises kun når dragon er besejret
  }
];

/**
 * House interior NPCs
 */
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

/**
 * Få NPCs for en given map
 */
export function getNPCsForMap(mapName: string): NPC[] {
  switch (mapName) {
    case 'village':
      return VILLAGE_NPCS;
    case 'house_interior':
      return HOUSE_INTERIOR_NPCS;
    default:
      return [];
  }
}

/**
 * Find en specifik NPC ved ID
 */
export function getNPCById(npcId: string): NPC | undefined {
  const allNPCs = [...VILLAGE_NPCS];
  return allNPCs.find(npc => npc.id === npcId);
}
