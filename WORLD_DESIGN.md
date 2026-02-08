# Skovens Helte - World Design

## World Concept
A small Danish-themed fantasy world where heroes must save their village from a dragon threatening the forest. The game features a linear progression through increasingly dangerous areas, culminating in a dragon boss fight.

## Map Structure

### 🏘️ Outdoor Maps (Overworld)

#### **1. Village (Landsby)** [IMPLEMENTED]
- **Description**: Peaceful starting area with shops, NPCs, and quest givers
- **Size**: 20x15 tiles
- **Enemies**: None
- **Features**:
  - General shop (house interior)
  - Friendly NPCs (elder, guard, villagers)
  - Animals (cow, pig, chicken, sheep)
  - Safe zone (no random encounters)
- **Connections**:
  - NORTH → Village Outskirts
  - EAST → Inn Interior (door)
  - WEST → Blacksmith Interior (door)

#### **2. Village Outskirts (Udkanten)**
- **Description**: Grassy area just outside the village, safe but with occasional weak monsters
- **Size**: 25x20 tiles
- **Enemies**: Slimes (low level, 10% encounter rate)
- **Features**:
  - Path leading north to forest
  - Small pond with water tiles
  - Open grassland
- **Connections**:
  - SOUTH → Village
  - NORTH → Forest Path

#### **3. Forest Path (Skovsti)**
- **Description**: Tree-lined path through the forest, moderate danger
- **Size**: 30x20 tiles
- **Enemies**: Slimes (20%), Wolves (15%), Bats (10%)
- **Features**:
  - Dense trees (oak trees as decoration)
  - Narrow winding path
  - Clearings with safe spots
  - Hidden treasure chest
- **Connections**:
  - SOUTH → Village Outskirts
  - NORTH → Dark Forest
  - WEST → Forest Clearing (optional side area)

#### **4. Dark Forest (Mørke Skov)**
- **Description**: Dangerous deeper forest, dark and foreboding
- **Size**: 30x25 tiles
- **Enemies**: Wolves (25%), Goblins (20%), Stone Golems (10%)
- **Features**:
  - Very dense trees
  - Rocky cliffs as obstacles
  - Abandoned camp (healing items)
  - Warning sign before Dragon's Lair entrance
- **Connections**:
  - SOUTH → Forest Path
  - NORTH → Dragon's Lair Entrance

#### **5. Dragon's Lair Entrance (Dragens Hule - Indgang)**
- **Description**: Cave entrance leading to final boss
- **Size**: 20x15 tiles
- **Enemies**: Goblins (30%), Stone Golems (15%)
- **Features**:
  - Large cave entrance (cliff tiles)
  - Scattered bones and treasure
  - Point of no return warning
  - Last save point before boss
- **Connections**:
  - SOUTH → Dark Forest
  - NORTH → Dragon's Lair Interior

---

### 🏠 Indoor Maps

#### **House Interior (Købmanden)** [IMPLEMENTED]
- **Description**: General shop selling potions and basic equipment
- **Size**: 20x15 tiles
- **NPCs**: Shopkeeper
- **Shop**: Village Shop (potions, basic sword/armor)

#### **Inn Interior (Kroen)**
- **Description**: Rest and save point, information hub
- **Size**: 20x15 tiles
- **NPCs**: Innkeeper, traveling merchant, drunk villager
- **Features**:
  - Beds for healing (50g)
  - Save point (free)
  - Rumors and tips about the forest

#### **Blacksmith Interior (Smeden)**
- **Description**: Weapon and armor shop
- **Size**: 20x15 tiles
- **NPCs**: Blacksmith
- **Shop**: Blacksmith Shop (advanced weapons, heavy armor)
- **Features**:
  - Forge (decoration)
  - Anvil and tools

#### **Elder's House (Ældstens Hus)**
- **Description**: Quest giver and story progression
- **Size**: 15x12 tiles
- **NPCs**: Village Elder
- **Features**:
  - Quest: "Defeat the Dragon"
  - Story exposition about the forest's curse
  - Reward: Hero's Medal (after defeating dragon)

#### **Dragon's Lair Interior (Dragens Hule)**
- **Description**: Final boss arena
- **Size**: 25x20 tiles
- **Enemies**: Red Dragon (boss, 100% encounter rate at center)
- **Features**:
  - Large open cavern
  - Treasure hoard (post-battle)
  - Dragon throne
  - Exit portal (back to village after victory)

---

## Progression Path

```
Village (Start)
    ↓ NORTH
Village Outskirts (Slimes, Level 1-2)
    ↓ NORTH
Forest Path (Wolves/Bats, Level 3-5)
    ↓ NORTH
Dark Forest (Goblins/Golems, Level 6-8)
    ↓ NORTH
Dragon's Lair Entrance (Final prep, Level 9+)
    ↓ NORTH
Dragon's Lair Interior (BOSS, Level 10+)
```

---

## Map Transitions Implementation

Each map will have defined transition points:

```typescript
// Example transition data structure
const MAP_CONNECTIONS = {
  village: {
    north: { map: 'village_outskirts', spawnX: 12, spawnY: 18 },
    house_door: { map: 'house_interior', spawnX: 10, spawnY: 11 }
  },
  village_outskirts: {
    south: { map: 'village', spawnX: 10, spawnY: 2 },
    north: { map: 'forest_path', spawnX: 15, spawnY: 18 }
  },
  // ... etc
};
```

---

## Visual Themes

- **Village**: Grass, farmland, houses, friendly atmosphere
- **Outskirts**: Grass, few trees, open sky
- **Forest Path**: Dense trees, winding path tiles, medium light
- **Dark Forest**: Very dense trees, cliffs, dark atmosphere
- **Dragon's Lair**: Cave tiles (cliffs), lava/fire?, dark, menacing

---

## Next Steps

1. Create `village_outskirts` map
2. Implement directional map transitions (N/S/E/W edge triggers)
3. Add encounter zones with appropriate enemy spawns
4. Create indoor maps (inn, blacksmith, elder's house)
5. Build forest progression maps
6. Create final Dragon's Lair interior
7. Add victory condition and ending sequence
