# Skovens Helte (Heroes of the Forest)

A browser-based 2D RPG inspired by classic SNES games, built with Phaser 3 and TypeScript.

## 🎮 Game Overview

**Skovens Helte** is a turn-based RPG where you explore a fantasy world, battle monsters, interact with NPCs, and ultimately defeat the Red Dragon threatening the village. The game features a classic 256x224 pixel SNES-style resolution with grid-based movement and strategic turn-based combat.

## ✨ Features

### Core Systems
- **Grid-based Overworld**: Explore a tile-based world with collision detection
- **Turn-based Combat**: Strategic battles with attack/defend/item mechanics
- **Inventory System**: Collect and manage potions, equipment, and loot
- **Equipment System**: Weapons and armor that affect your stats
- **NPC Interaction**: Talk to villagers and receive quests
- **Shop System**: Buy potions and equipment with gold
- **Save/Load System**: Persistent game state using localStorage
- **Event System**: Conditional NPC spawning and dialog based on story flags
- **Level System**: Gain experience and level up to increase stats
- **Victory Screen**: End-game statistics display

### Game Content
- **3 Explorable Maps**: Village, Forest North/South, Mountain
- **6 Monster Types**: Slimes, Wolves, Goblins, Bats, Golems, and the Red Dragon boss
- **9 Equipment Items**: Wooden Sword → Iron Sword → Steel Sword (weapons), Leather Armor → Chainmail → Plate Armor (armor)
- **4 Consumable Items**: Healing Potions (small/large), Mana Potions (small/large)
- **6 NPCs**: Village Elder, Guard, Shopkeeper, Blacksmith, Healer, and Mysterious Stranger
- **Dynamic Dialog System**: Context-sensitive conversations with story progression

## 🚀 Installation

### Prerequisites
- Node.js 16+ and npm/yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/skovens-helte-2.git
cd skovens-helte-2

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The game will be available at `http://localhost:5173` (or the port shown in your terminal).

## 🎯 Controls

| Action | Key |
|--------|-----|
| Move | Arrow Keys |
| Interact / Confirm | Enter |
| Open Menu | Escape |
| Cancel / Back | Escape |

### Menu Navigation
- **Arrow Keys**: Navigate options
- **Enter**: Select option
- **Escape**: Close menu / Back

## 📖 Gameplay Guide

### Starting Out
1. **New Game**: Start at the village with basic equipment (Wooden Sword, Leather Armor)
2. **Talk to NPCs**: Interact with the Village Elder to learn about the dragon threat
3. **Explore Safely**: Start in Forest North (beginner area) to level up

### Combat Tips
- **Defend First Turn**: Reduce damage while learning enemy patterns
- **Use Potions Wisely**: Don't waste expensive potions on easy battles
- **Check Stats**: Open Menu (Esc) → Stats tab to monitor your HP/level
- **Flee When Low**: Better to retreat and heal than to die

### Progression Path
1. **Forest North** (Lv 1-3): Fight Slimes and Wolves
   - Collect healing potions
   - Save gold for better equipment

2. **Forest South** (Lv 3-5): Fight Wolves and Goblins
   - Upgrade to Iron Sword (150g) and Chainmail (300g)
   - Stock up on Large Healing Potions

3. **Mountain** (Lv 5-8): Fight Bats and Stone Golems
   - Reach Level 8+ before challenging the dragon
   - Get Steel Sword (500g) and Plate Armor (800g)

4. **Dragon's Lair** (Lv 8+): Final boss battle
   - Bring 5+ Large Healing Potions
   - Defend when low HP (<30%)
   - Watch for Fire Breath special attack

### Economy & Shopping
- **Gold Sources**: Monster drops (5-25g per monster) + selling loot
- **Essential Purchases**:
  - Iron Sword (150g) - critical for mid-game
  - Chainmail (300g) - greatly improves survivability
  - Large Healing Potions (50g) - needed for tough battles
- **Budget**: Expect 20-30 battles to afford mid-tier equipment

## 📊 Monster Database

| Monster | HP | ATK | DEF | XP | Gold | Location | Notes |
|---------|----|----|-----|-------|------|----------|-------|
| Slime | 15 | 5 | 2 | 5 | 5g | Forest North | Beginner enemy |
| Wolf | 25 | 9 | 3 | 10 | 10g | Forest North/South | Fast attacker |
| Goblin | 30 | 11 | 5 | 15 | 15g | Forest South | Medium difficulty |
| Bat | 18 | 8 | 2 | 8 | 8g | Mountain | Low HP, fast |
| Stone Golem | 50 | 14 | 12 | 25 | 25g | Mountain | High defense |
| **Red Dragon** | 200 | 22 | 15 | 0 | **500g** | Dragon's Lair | BOSS - Fire Breath attack |

## 🗡️ Equipment Database

### Weapons
| Item | ATK | Cost | Description |
|------|-----|------|-------------|
| Wooden Sword | +3 | Starter | Basic training sword |
| Iron Sword | +8 | 150g | Solid iron blade |
| Steel Sword | +15 | 500g | Master-crafted weapon |

### Armor
| Item | DEF | Cost | Description |
|------|-----|------|-------------|
| Leather Armor | +2 | Starter | Simple leather protection |
| Chainmail | +6 | 300g | Interlocking metal rings |
| Plate Armor | +12 | 800g | Full plate protection |

### Consumables
| Item | Effect | Cost | Description |
|------|--------|------|-------------|
| Healing Potion | +30 HP | 20g | Restores 30 health |
| Large Healing Potion | +60 HP | 50g | Restores 60 health |
| Mana Potion | +20 MP | 25g | (Future: Magic system) |
| Large Mana Potion | +40 MP | 60g | (Future: Magic system) |

## 🏗️ Project Structure

```
src/
├── data/              # Game data and content
│   ├── dialogs.ts     # NPC dialog trees
│   ├── items.ts       # Item database
│   ├── monsters.ts    # Monster stats and encounters
│   ├── npcs.ts        # NPC spawn data
│   └── maps.ts        # World map definitions
├── scenes/            # Phaser game scenes
│   ├── BootScene.ts   # Asset loading
│   ├── TitleScene.ts  # Main menu
│   ├── OverworldScene.ts  # Exploration
│   ├── DialogScene.ts     # NPC conversations
│   ├── CombatScene.ts     # Turn-based battles
│   ├── MenuScene.ts       # Character menu
│   ├── ShopScene.ts       # Merchant interface
│   └── VictoryScene.ts    # End game screen
├── services/          # Game services
│   └── InputService.ts    # Keyboard handling
├── systems/           # Core game systems
│   ├── CombatSystem.ts    # Damage calculation
│   ├── EventSystem.ts     # Story flags
│   ├── GameState.ts       # State management
│   ├── InventorySystem.ts # Item management
│   ├── LevelSystem.ts     # XP and leveling
│   └── LootSystem.ts      # Drop generation
├── types/             # TypeScript interfaces
│   └── index.ts       # Type definitions
└── main.ts            # Game entry point
```

## 🎨 Technical Details

- **Engine**: Phaser 3.87.0
- **Language**: TypeScript 5.7
- **Resolution**: 256x224 (SNES standard)
- **Scaling**: Auto-fit with pixel-perfect rendering
- **Tile Size**: 16x16 pixels
- **Grid Movement**: 8-directional with collision
- **Save System**: Browser localStorage (JSON)

## 📝 Development Phases

### ✅ Phase 1: Core Setup (Complete)
- Phaser 3 + TypeScript + Vite configuration
- Basic scene structure
- Asset loading system

### ✅ Phase 2: Overworld (Complete)
- Grid-based player movement
- Collision detection
- Map transitions
- Random encounters

### ✅ Phase 3: Combat System (Complete)
- Turn-based battle mechanics
- Attack/Defend/Item actions
- Enemy AI (basic/aggressive/boss)
- Experience and leveling
- Loot generation

### ✅ Phase 4: Menus & NPCs (Complete)
- Inventory/Stats/Equipment menus
- Save/Load system
- NPC interaction
- Dialog system with conditions
- Shop interface

### ✅ Phase 5: Polish & Balance (Complete)
- Bug fixes (inventory full, scene transitions)
- Gold economy balance (added monster gold drops)
- Victory screen
- UX improvements

## 🐛 Known Limitations

- **Placeholder Graphics**: Using colored rectangles instead of sprites
- **No Sound**: Music and sound effects not implemented
- **Single Quest**: Linear story progression only
- **No Magic**: Mana system prepared but not implemented
- **Basic AI**: Monsters use simple attack patterns

## 🔮 Future Enhancement Ideas

- **Real Pixel Art**: Replace placeholders with proper 16x16 sprites
- **More Content**:
  - Additional maps (caves, castles, towns)
  - More monster varieties
  - Side quests and optional bosses
- **Skills & Magic**: Implement mana-based abilities
- **Animations**: Attack effects, damage numbers, spell animations
- **Music & SFX**: Chiptune soundtrack and retro sound effects
- **Party System**: Recruit companions to fight alongside you
- **Crafting**: Combine materials to create items
- **Achievements**: Track player accomplishments

## 📜 Changelog

### Version 1.0.0 (Phase 5 Complete)
- ✅ All core systems implemented
- ✅ NPC interaction and dialog system
- ✅ Save/Load functionality
- ✅ Victory screen with statistics
- ✅ Balanced economy with monster gold drops
- ✅ Bug fixes for inventory and scene transitions

## 👤 Author

Created as a browser-based RPG demo project.

## 📄 License

This project is available for educational and portfolio purposes.

---

**Enjoy your adventure in Skovens Helte!** 🌲⚔️🐉
