# Tiled Map Editor Guide

These map files (`village.json`, `house_interior.json`) are ready to open in **Tiled Map Editor**.

## Opening Maps in Tiled

1. Download Tiled from: https://www.mapeditor.org/
2. Open Tiled
3. File → Open → Select `public/maps/village.json` or `house_interior.json`

## Map Structure

### Tile Values (for Ground and Obstacles layers)
- `0` = Grass (ground, walkable)
- `1` = Farmland (wall, blocks movement)
- `2` = Large cliff (3x3, blocks movement)
- `3` = Small cliff (2x2, blocks movement)

### Layers

**Ground Layer** (Tile Layer)
- Base terrain tiles
- Tiles 0 (grass) and 1 (farmland/walls)

**Obstacles Layer** (Tile Layer)
- Cliff tiles and other obstacles
- Has `collides: true` property for collision detection
- Tiles 2 (large cliff) and 3 (small cliff)

**Objects Layer** (Object Layer)
- NPCs, decorations, transitions
- Each object has custom properties

### Object Types

**decoration**
- Visual objects like house, animals
- Properties:
  - `sprite`: Sprite key (e.g., "house_wood", "cow")
  - `shopId`: (optional) Shop ID if interactable

**transition**
- Map transitions (doors, portals)
- Properties:
  - `targetMap`: Map ID to transition to
  - `targetX`: Target grid X position
  - `targetY`: Target grid Y position

**npc** (not yet in maps, but you can add)
- Properties:
  - `npcId`: NPC identifier from npcs.ts
  - `dialog`: Dialog ID to show
  - `shopId`: (optional) Shop ID if NPC has shop

## Editing Maps

1. **Add tiles**: Select Ground or Obstacles layer, use Stamp Brush tool
2. **Add objects**: Select Objects layer, Insert → Rectangle, add custom properties
3. **Set collision**: Select Obstacles layer, right-click → Layer Properties → Add `collides: true`

## Tile IDs

Currently, the maps use numeric tile IDs (0, 1, 2, 3). To use actual tilesets:
1. Create a tileset in Tiled using your tile images
2. Map → Add Tileset
3. Replace numeric IDs with tileset tile IDs

## Implementing Tiled Maps in Game

To use these maps in the game:
1. Load in BootScene: `this.load.tilemapTiledJSON('village', 'maps/village.json')`
2. In OverworldScene, replace `createVillageMap()` with Tiled loading:
   ```typescript
   const map = this.make.tilemap({ key: 'village' });
   const groundLayer = map.createLayer('Ground', tileset, 0, 0);
   const obstaclesLayer = map.createLayer('Obstacles', tileset, 0, 0);
   ```
3. Read objects from map.getObjectLayer('Objects')

## Notes

- Maps are 20x15 tiles (320x240 pixels)
- Each tile is 16x16 pixels
- Coordinates in Tiled are in pixels, not grid positions
- To convert: gridX = pixelX / 16, gridY = pixelY / 16
