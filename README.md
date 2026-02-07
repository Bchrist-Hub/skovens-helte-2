# Skovens Helte

Et kort browser-baseret 2D RPG inspireret af SNES-æraen, bygget med Phaser 3 og TypeScript.

## 🎮 Features (Fase 1 - Fundament)

✅ **Grid-baseret bevægelse** - Smooth tile-for-tile bevægelse (16x16 px tiles)
✅ **Centraliseret input-håndtering** - InputService forhindrer input-konflikter mellem scenes
✅ **Scene-system** - Boot, Title, Overworld, Dialog scenes
✅ **Dialog-system** - Typewriter-effekt, JRPG-style dialog-bokse
✅ **Kollisionsdetektion** - Grid-baseret kollision med vægge
✅ **Kamera-system** - Følger spilleren smooth
✅ **Save/Load** - localStorage-baseret gem-system
✅ **Pixel-perfect rendering** - SNES-style 256x224 opløsning med nearest-neighbor scaling

## 🚀 Kom i gang

### Installation

```bash
npm install
```

### Kør udviklings-server

```bash
npm run dev
```

Spillet åbner automatisk i din browser på `http://localhost:3000`

### Byg til produktion

```bash
npm run build
```

Dette genererer en optimeret build i `dist/` mappen.

## 🎯 Kontrolskema

- **Piletaster / WASD** - Bevægelse
- **Enter / Space** - Handling / Bekræft / Vis test-dialog
- **Escape** - Annuller / Menu
- **M** - Åbn menu (kommer i næste fase)

## 📁 Projekt-struktur

```
src/
├── scenes/           # Phaser scenes (rendering + input)
│   ├── BootScene.ts       # Asset loading
│   ├── TitleScene.ts      # Hovedmenu
│   ├── OverworldScene.ts  # Hoved-gameplay
│   └── DialogScene.ts     # Dialog overlay
│
├── systems/          # Ren spillogik (ingen Phaser)
│   └── GameState.ts       # Spilstatus og save/load
│
├── services/         # Delte services
│   └── InputService.ts    # Centraliseret input-håndtering
│
├── types/            # TypeScript interfaces
│   └── index.ts
│
└── main.ts           # Entry point, Phaser config
```

## 🔧 Tekniske detaljer

### InputService - Centraliseret input

**VIGTIG ARKITEKTUR-BESLUTNING:**

I stedet for at hver scene opretter sine egne key-bindings med `scene.input.keyboard.addKey()`,
bruger vi en central `InputService` der håndterer al input ét sted.

Dette forhindrer et klassisk Phaser-problem hvor scenes "låser" tasterne for hinanden.

**Brug:**
```typescript
// I create()
this.inputService = new InputService(this);

// I update()
this.inputService.update();

if (this.inputService.justPressed('action')) {
  // Handling her
}

// I shutdown()
this.inputService.destroy(); // Nulstiller referencerne UDEN at kalde removeKey()
```

### Scene-håndtering

**Overlay scenes** (Menu, Dialog) bruger `scene.launch()` og `scene.stop()`:

```typescript
// Start overlay
this.scene.launch('DialogScene');

// Stop overlay (IKKE pause/resume!)
this.scene.stop('DialogScene');
```

Dette er sikrere end pause/resume og forhindrer input-problemer.

### Grid-baseret bevægelse

Spilleren bevæger sig ét tile (16x16 px) ad gangen med smooth interpolation (150ms).

Bevægelse er implementeret som tweens, ikke physics-baseret:
- Præcis kontrol
- Ingen floating-point fejl
- Perfekt til trigger-detektion

## 📋 Næste skridt (Fase 2)

- [ ] Implementer CombatSystem
- [ ] Implementer CombatScene
- [ ] Implementer encounter-system
- [ ] Implementer fjende-AI
- [ ] Test komplet kamp fra start til slut

## 🐛 Debugging

TypeScript type-check uden at bygge:
```bash
npx tsc --noEmit
```

## 📝 Noter

- **Pixel-perfect**: Alle assets skal være 16x16 px eller multipler heraf
- **Farvepalette**: Brug en begrænset 32-color palette (SNES-stil)
- **No scope creep**: Følg implementeringsplanen strengt

## 📄 Licens

Dette er et læringsprojekt. Brug frit til inspiration.
