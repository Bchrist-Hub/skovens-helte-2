# Skovens Helte — Implementeringsplan

## 1. Overordnet spilbeskrivelse

Et kort, afsluttet singleplayer 2D top-down RPG i browseren. Spilleren udforsker tre sammenhaengende zoner (landsby, skov, bjerg), kaemper turbaserede kampe, bliver staerkere, og besejrer en slutboss.

Spillets fulde laengde: 30-60 minutter for en enkelt gennemspilning.

### Historiestruktur

**Akt 1 — Landsbyen.** Spilleren ankommer. Aeldsten forklarer problemet: monstre angriber om natten. Spilleren faar basalt udstyr og sendes mod skoven.

**Akt 2 — Skoven.** Spilleren kaemper sig igennem to skovzoner med stigende svaerhedsgrad. Ved skovens udkant afslorer en doende NPC (eller et tegn), at monstrene styres af noget i bjerget.

**Akt 3 — Bjerget.** Haard zone med staerkere monstre. Lineaer sti op mod toppen. Ved toppen: dragens hule.

**Akt 4 — Dragen.** Slutkamp mod den rode drage. Sejr udloser en kort epilog og slutskaerm.

Der er ingen sidequests, ingen forgrenede valg, ingen alternative ender. Historien er lineaer og det er en styrke — den kan poleres til at foeles komplet.

### Bevaegelse: Grid-baseret

Valget er grid-baseret bevaegelse (tile-for-tile), ikke fri bevaegelse. Begrundelse:

- Praecis kollisionsdetektion uden brug af fysikmotor
- Nemmere map-design: hvert tile har klar funktion (blokeret, trigger, gennemgaaeligt)
- Passer perfekt til SNES-aera RPG-aesetik (Final Fantasy IV-VI, Zelda: ALttP)
- Random encounters kan udloeses per skridt, hvilket giver forudsigelig pacing
- Reducerer bevaegelsesbugs markant sammenlignet med pixel-bevaegelse

Spilleren bevaaeger sig et helt tile ad gangen med en kort interpoleret animation (ca. 150ms per tile). Input under bevaegelse queues naeste retning, saa det foeles responsivt.

---

## 2. Teknologistack

### Valg: Phaser 3 + TypeScript

**Phaser 3** er et modent 2D game framework til browseren. TypeScript tilfojer typesikkerhed uden overhead i runtime.

### Begrundelse

**Hvorfor Phaser 3 fremfor ren Canvas + JS:**
- Tilemap-support ud af boksen (indlaeser Tiled JSON direkte)
- Scene-system der naturligt mapper til spiltilstande (overworld, kamp, menu)
- Sprite-animation, asset loading, skalering og kamera er loest
- Vi skriver spilsystemer, ikke en game engine. Phaser loeser infrastruktur, vi loeser design.

**Hvorfor ikke PixiJS:**
- PixiJS er en renderer, ikke et framework. Vi ville skulle bygge scene management, input abstraction og asset pipeline selv. Det er unodvendigt arbejde for dette scope.

**Hvorfor ikke raw Canvas:**
- Ville kraeve at vi genopfinder tilemap rendering, spritesheet haandtering, animation state machines, input buffering og kamerasystem. Alt dette er loest i Phaser. Raw Canvas giver kontrol vi ikke har brug for og koster tid vi ikke har.

**Hvorfor TypeScript:**
- Et spil med combat formulas, stat-systemer og inventory kraever typesikkerhed. Fejl i en skadesformel der returnerer NaN er svaer at debugge i rent JS. TypeScript fanger det ved compile-time.
- Autocompletion paa datastrukturer (monster stats, items, spells) oeger produktivitet.
- Ingen runtime-overhead — det transpileres til JS.

### Tooling

- **Tiled** (tilemap editor) til alle maps. Eksporterer JSON.
- **Aseprite** (eller lignende) til sprites og tiles. Eksporterer PNG spritesheets.
- **Vite** som bundler og dev server (hurtig HMR, TypeScript support, simpel config).
- **localStorage** til save/load. Ingen backend.

### Deployment

Statisk build (HTML + JS + assets). Kan hostes paa enhver statisk hosting (GitHub Pages, Netlify, itch.io).

---

## 3. Arkitektur

### 3.1 Overordnet struktur

Projektet organiseres i to lag:

**Phaser-laget:** Scenes, rendering, input, asset loading. Dette lag kalder ned i spilsystemerne.

**Systemlaget:** Ren TypeScript-logik uden Phaser-afhaengigheder. Combat, stats, inventory, events. Kan testes uafhaengigt.

Dette giver os testbarhed og fleksibilitet. Kampsystemet ved ikke hvad Phaser er. Det modtager handlinger og returnerer resultater. Phaser-scenen visualiserer resultaterne.

```
src/
  scenes/           ← Phaser scenes (rendering + input)
  systems/          ← Ren spillogik (ingen Phaser)
  data/             ← JSON/TS data (monstre, items, maps, dialog)
  ui/               ← UI-komponenter (menuer, HUD, dialogbokse)
  utils/            ← Hjaelpefunktioner (tilfaeldighed, formler)
  types/            ← TypeScript interfaces og typer
  main.ts           ← Entry point, Phaser config
```

### 3.2 Scenes (Phaser-laget)

Hver scene har et klart ansvar. Phaser haandterer scene-overgange.

**BootScene**
- Indlaeser alle assets (spritesheets, tilemaps, lyd)
- Viser loading bar
- Skifter til TitleScene naar alt er loaded

**TitleScene**
- Titelskaaerm med "Nyt spil" og "Fortsaet" (hvis save eksisterer)
- Ingen gameplay

**OverworldScene**
- Renderer tilemap fra Tiled-data
- Styrer spillerens grid-bevaegelse
- Checker triggers (NPC-dialog, zone-overgange, events)
- Taaeller skridt og udloeser random encounters
- Modtager input og mapper til handlinger (bevaegelse, interaktion, aaben menu)

**CombatScene**
- Modtager kampinitialiseringsdata (hvilke monstre, baggrund)
- Viser kamp-UI (spiller stats, fjende sprites, handlingsmenu)
- Delegerer al kamplogik til CombatSystem
- Animerer resultater (skade, healing, doed)
- Ved afslutning: returnerer til OverworldScene med resultater (XP, items)

**MenuScene**
- Overlay-scene (pauses OverworldScene men fjerner den ikke)
- Viser: Stats, Inventory, Equipment, Save
- Navigation med piletaster eller mus

**DialogScene**
- Overlay-scene til dialog
- Typewriter-effekt paa tekst
- Understotter portratter (valgfrit — kun hvis tid)
- Lukker og returnerer kontrol til forrige scene

### 3.3 CombatSystem (Systemlaget)

Det vigtigste system. Skal vaere helt adskilt fra rendering.

**Ansvar:**
- Modtager kampdeltagere (spiller + fjender) som datastrukturer
- Bestemmer tur-raekkefoolge
- Modtager spillerens valgte handling
- Udforer fjende-AI
- Beregner skade, healing, statuseffekter
- Returnerer et CombatEvent per handling (hvad skete, til hvem, resulterende HP)
- Melder naar kampen er slut og hvorfor (sejr, nederlag)

**Handlinger:**

| Handling | Effekt |
|---|---|
| Haardt angreb | Skade = ATK * 1.5 - DEF. 70% praecision. Hoej risiko, hoej gevinst. |
| Balanceret angreb | Skade = ATK - DEF. 95% praecision. Standard valg. |
| Forsvar | Halverer modtaget skade naeste fjende-tur. |
| Helende drik | Gendanner fast HP (skalerer med level). Forbruger 1 drik fra inventory. |
| Magi: Ild | MP-kost. Magisk skade der ignorerer en del af DEF. God mod hoej-DEF fjender. |
| Magi: Helbred | MP-kost. Gendanner HP baseret paa magi-stat (eller level). |

**Skadesformel (simpel og laesbar):**

```
fysisk_skade = max(1, angriber.ATK * modifier - forsvarer.DEF * forsvarsmodifier)
magisk_skade = max(1, spell.power + caster.level * 2 - forsvarer.DEF * 0.3)
```

Minimum 1 skade sikrer at kampe altid kan afsluttes.

**Fjende-AI:**

Hvert monster har en simpel prioritetsliste:

```
- Hvis HP < 30% og har healing: heal (kun boss)
- Hvis spiller har lav HP: brug staerkt angreb
- Ellers: vaelg tilfaeldigt fra monstertypens tilgaengelige handlinger med vaegt
```

Dragen har en speciel fase 2 (under 50% HP) hvor den bruger ildangreb oftere.

**Datastruktur for en kamphandling (CombatEvent):**

```
{
  actor: "player" | monster-id
  action: "attack_heavy" | "attack_normal" | "defend" | "item" | "spell"
  target: "player" | monster-id
  hit: boolean
  damage: number
  healing: number
  mpCost: number
  resultingHP: number
  message: string        ← "Ulven angriber! 12 skade."
  combatEnded: boolean
  combatResult: "victory" | "defeat" | null
}
```

### 3.4 CharacterSystem

**Ansvar:**
- Holder spillerens aktuelle stats, level, XP
- Beregner level-ups
- Anvender udstyrsbonusser

**Datastruktur:**

```
Player {
  name: string
  level: number           ← starter paa 1, max 10
  xp: number
  xpToNext: number        ← beregnet fra level-tabel
  baseStats: {
    maxHP: number
    maxMP: number
    atk: number
    def: number
  }
  currentHP: number
  currentMP: number
  equipment: {
    weapon: Item | null
    armor: Item | null
  }
}
```

**Level-tabel (haardkodet, 10 levels):**

Hvert level giver faste stat-stigninger. Ingen tilfaeldighed. Spilleren kan altid se praecist hvad naeste level giver.

XP-kravet stiger per level: 20, 50, 100, 170, 260, 380, 530, 720, 950.

Forventet level ved hvert omraade:
- Landsby: level 1
- Tidlig skov: level 2-3
- Sen skov: level 4-5
- Bjerg: level 6-7
- Drage: level 8-9

Level 10 er kun opnaaeligt ved at kaempe ekstra kampe (beloenning for grundige spillere, ikke et krav).

### 3.5 InventorySystem

**Ansvar:**
- Holder spillerens items
- Haandterer tilfoejelse, fjernelse, brug af items
- Haandterer udrustning (equip/unequip)

**Datastruktur:**

```
Inventory {
  items: Array<{ item: Item, quantity: number }>
  maxSlots: 20        ← fast graense, undgaar UI-problemer
}

Item {
  id: string
  name: string
  type: "weapon" | "armor" | "consumable"
  description: string
  stats: {             ← kun for equipment
    atk?: number
    def?: number
  }
  effect: {            ← kun for consumables
    type: "heal_hp" | "heal_mp"
    value: number
  }
}
```

### 3.6 EventSystem

**Ansvar:**
- Holder styr paa spillets progression via flag (booleans)
- Afgoer hvad der sker naar spilleren interagerer med triggers

**Datastruktur:**

```
EventFlags {
  [key: string]: boolean
}

Eksempler:
  "talked_to_elder": true
  "entered_forest": true
  "found_dying_npc": false
  "defeated_dragon": false
```

Triggers paa maps refererer til event-flag:

```
MapTrigger {
  tileX: number
  tileY: number
  type: "dialog" | "transition" | "event" | "shop"
  condition?: string          ← event-flag der skal vaere sat
  payload: string             ← dialog-id, map-id, event-id
}
```

Dette system er simpelt men tilstraekkeligt. NPC'er kan sige forskellige ting baseret paa flag. Doore kan aabne naar et flag er sat. Ingen scripting engine noedvendig.

### 3.7 Kommunikation mellem systemer

Systemerne kommunikerer via et simpelt event-bus moenster:

```
OverworldScene → (spilleren gaar paa encounter-tile) → CombatSystem.startCombat(enemies)
CombatSystem → (kamp slut) → CharacterSystem.addXP(amount), InventorySystem.addItems(loot)
CharacterSystem → (level up) → returnerer nye stats, CombatScene viser level-up besked
OverworldScene → (spilleren interagerer med NPC) → EventSystem.checkFlags() → DialogScene.show(dialog)
MenuScene → (spilleren equpper item) → InventorySystem.equip() → CharacterSystem.recalculateStats()
```

Der er ingen global event bus med subscribers. Systemerne kalder hinanden direkte via metoder. En global GameState holder references til alle systemer og injiceres i scenes.

```
GameState {
  player: Player
  inventory: Inventory
  eventFlags: EventFlags
  currentMap: string
  playTime: number
  encounterSteps: number     ← taaeller skridt til naeste encounter
}
```

GameState serialiseres til JSON for save/load via localStorage.

---

## 4. Content-struktur

Alt indhold defineres i separate datafiler (TypeScript-filer der eksporterer typed objekter, eller JSON). Kernesystemerne laeser fra disse filer men har ingen hardkodede vaerdier.

### 4.1 Maps

Lavet i Tiled. Eksporteret som JSON.

| Map | Stoerrelse (tiles) | Funktion |
|---|---|---|
| Landsbyen | 30x25 | Startzone. 4-5 NPC'er, shop, aeldstens hus. Ingen kampe. |
| Skov Nord | 40x30 | Foerste kampzone. Lave monstre. Sti mod syd. |
| Skov Syd | 40x35 | Haardere monstre. Doende NPC-event. Udgang til bjerg. |
| Bjerget | 30x50 | Vertikal lineaer sti opad. Staerkeste normale monstre. |
| Dragens Hule | 15x15 | Lille kammer. Boss-trigger. Ingen random encounters. |

Hvert map har tre tile-layers:
- **Ground**: Graes, sti, sten, vand (altid under spilleren)
- **Objects**: Traeer, huse, mobler, klipper (kollision)
- **Above**: Traetoppe, tagudhaaeng (renderes over spilleren for dybdeeffekt)

Og et object-layer i Tiled til triggers (NPC-positioner, zone-overgange, event-triggers).

### 4.2 Monstre

```
Monster {
  id: string
  name: string
  sprite: string
  stats: { maxHP, atk, def }
  xpReward: number
  loot: Array<{ itemId: string, chance: number }>
  actions: Array<{ type: string, weight: number }>
  aiType: "basic" | "aggressive" | "boss"
}
```

| Monster | HP | ATK | DEF | XP | Zone |
|---|---|---|---|---|---|
| Slim | 15 | 5 | 2 | 5 | Skov Nord |
| Ulv | 25 | 9 | 3 | 10 | Skov Nord/Syd |
| Goblin | 30 | 11 | 5 | 15 | Skov Syd |
| Flagermus | 18 | 8 | 2 | 8 | Bjerg |
| Stengolem | 50 | 14 | 12 | 25 | Bjerg |
| Roed Drage | 200 | 22 | 15 | 0 | Hule (boss) |

Encounter tables per map definerer hvilke monstre der kan dukke op og med hvilken sandsynlighed. 1-2 monstre per kamp (aldrig mere, det forenkler UI og balancering).

### 4.3 Items

| Item | Type | Effekt | Findes |
|---|---|---|---|
| Traesvaerd | Weapon | ATK +3 | Start-udstyr |
| Jernsvaerd | Weapon | ATK +7 | Shop / loot |
| Magisvaerd | Weapon | ATK +12 | Bjerg-kiste |
| Laederrustning | Armor | DEF +3 | Start-udstyr |
| Ringbrynje | Armor | DEF +7 | Shop |
| Drageskaelrustning | Armor | DEF +12 | Droploot |
| Helbredelsesdrik | Consumable | +30 HP | Shop, loot |
| Stor helbredelsesdrik | Consumable | +80 HP | Shop (dyr), loot |
| Manadrik | Consumable | +20 MP | Shop, loot |

### 4.4 Spells

| Spell | MP-kost | Effekt | Laeres |
|---|---|---|---|
| Ild | 5 | 15 + level*2 magisk skade | Start |
| Helbred | 4 | Gendanner 20 + level*3 HP | Start |

To spells er nok. De giver taktisk dybde (bruge MP offensivt eller defensivt?) uden at kraeve et spell-menu-system med mange sider.

### 4.5 Dialog

Dialog defineres i separate filer per NPC/event:

```
DialogEntry {
  id: string
  speaker: string
  lines: string[]              ← vises en ad gangen med typewriter
  condition?: string           ← event-flag der skal vaere opfyldt
  setsFlag?: string            ← event-flag der saettes efter dialogen
  next?: string                ← naeste dialog-id (for sekvenser)
}
```

Eksempel:

```
{
  id: "elder_intro",
  speaker: "Aeldsten",
  lines: [
    "Du er endelig kommet.",
    "Monstrene angriber hver nat. Vi mister flere for hver dag.",
    "Skoven... noget styrer dem derinde."
  ],
  setsFlag: "talked_to_elder",
  next: "elder_gives_quest"
}
```

NPC'er checker flags for at bestemme hvilken dialog de viser. Ingen dialogtraeer med valg — kun lineaer dialog med betingelser.

### 4.6 Udvidbarhed

At tilfoeje nyt indhold kraever:

- **Nyt monster:** Tilfoej entry i monster-data, tilfoej sprite, tilfoej til encounter table
- **Nyt item:** Tilfoej entry i item-data
- **Ny spell:** Tilfoej entry i spell-data, tilfoej handling i CombatSystem
- **Nyt map:** Opret i Tiled, tilfoej transitions, tilfoej encounter table
- **Ny dialog:** Tilfoej dialog-entries, saet triggers paa map

Ingen af disse kraever aendringer i kernesystemerne.

---

## 5. Visuel stil og praesentation

### 5.1 Tekniske maal

| Element | Stoerrelse |
|---|---|
| Tile | 16x16 px |
| Karakter-sprites | 16x16 px (1 tile) |
| Kamp-sprites | 48x48 px (spilleren og monstre i kampvisning) |
| Intern oploesning | 256x224 px (SNES-oploesning) |
| Skalering | Nearest-neighbor, 3x eller 4x afhaaengigt af skaerm |
| Viewport | 16x14 tiles synlige ad gangen |

Den lave interne oploesning er afgoerende. Den tvinger pixel art til at foeles sammenhaengende og forhindrer "mixed resolution"-problemet der oedelaegger mange indie-spil.

### 5.2 Farvepalette

Brug en begraenset palette paa 32 farver, inspireret af SNES. Specifikt anbefales det at vaelge en eksisterende retro-palette (f.eks. ENDESGA 32 eller en SNES-inspireret palette) og holde sig strengt til den.

Farvebegrandsning giver:
- Visuel sammenhaeng paa tvaers af alle assets
- Autentisk retro-feeling
- Hurtigere asset-produktion (faerre valg)

### 5.3 Animationer

Begrandsede men bevidste:

**Overworld:**
- Spilleren: 4 retninger x 2 frames walk cycle = 8 frames total
- NPC'er: Idle (1 frame) + retningsvendt (2-4 retninger, 1 frame hver). Ingen walk-animation for NPC'er.
- Vand: 2-frame animation (tile swap)
- Resten er statisk

**Kamp:**
- Spilleren: Idle (1 frame), angreb (2 frames), tage-skade (1 frame), doed (1 frame)
- Monstre: Idle (1-2 frames oscillation), tage-skade (flash hvid)
- Effekter: Skadestal der flyver op (tween), flash-overlay ved hit, simpel partikeleffekt ved magi (4-6 frames)

**UI:**
- Typewriter-tekst: Bogstav for bogstav, skippes med handling
- Menu-cursor: 2-frame blink
- Scene-overgange: Fade to black (Phaser's built-in camera fade)

Tommelfingerregel: Hvis en animation ikke forbedrer game feel eller laesbarhed, lad vaere.

### 5.4 UI-stil

**Dialogbokse og menuer:**
- Moerkeblaa baggrund (RGB ca. 16, 24, 64) med 2px lys kant (hvid eller lyseblaa)
- Afrundede hjoerner simuleret med pixels (1px cut i hjoerner)
- Dette er den klassiske Final Fantasy / Dragon Quest ramme
- Alle menuer bruger dette visuelle sprog konsekvent

**Font:**
- Bitmap pixel font, 8x8 px per tegn
- Hvid tekst paa moerk baggrund
- Skal understoette danske tegn (ae, oe, aa)
- Enten find en eksisterende pixel font med udvidet latin, eller lav en minimal custom font

**HUD i kamp:**
- Spiller-stats i bund af skaermen (HP-bar, MP-bar, navn, level)
- Fjende oeverst paa skaermen (centreret sprite)
- Handlingsmenu i bund-hoejre
- Beskeder i midten (skadestal, "Ulven angriber!")

**HUD i overworld:**
- Minimal. Ingen permanent HUD. Information vises via menu (aabnes med Escape/Enter).
- Eventuelt et lille ikon naar interaktion er mulig (tryk for at tale)

### 5.5 Professionel vs. amatoer

De vigtigste forskelle mellem et professionelt og amatoermaessigt retro-spil:

| Professionelt | Amatoer |
|---|---|
| Konsekvent palette | Blandede farver fra forskellige kilder |
| Ensartet pixel-stoerrelse overalt | Mixed resolution sprites og tiles |
| Bevidst begrandsede animationer | Enten ingen eller overdrevne animationer |
| Konsekvent UI-sprog (samme rammestil) | Tilfaeldig UI med forskellige stile |
| Game feel: screen shake, flash, tweens | Ting sker bare uden feedback |
| Korrekt tile-overlap (traeer over spiller) | Alt paa samme lag |

De foerste tre punkter er gratis — de kraever disciplin, ikke tid. De sidste tre kraever lidt ekstra arbejde i polish-fasen.

---

## 6. Produktionsplan

### Fase 1: Fundament (uge 1-2)

**Maal:** Spilleren kan gaa rundt paa et map.

Opgaver:
- Opret projekt med Vite + TypeScript + Phaser 3
- Implementer BootScene med asset loading
- Lav et simpelt test-tilemap i Tiled (10x10)
- Implementer grid-bevaegelse med smooth interpolation
- Implementer kollision med blocked tiles
- Implementer kamera der foelger spilleren
- Implementer scene-overgang (fade to black) mellem to test-maps
- Implementer basis UI-ramme (dialogboks med typewriter-tekst)

**Spilbart:** Nej, men fundamentet er solidt. Alt fremtidigt arbejde bygger paa dette.

**Bevidst udeladt:** Kamp, stats, items, indhold.

### Fase 2: Kamp-prototype (uge 3-4)

**Maal:** En komplet kamp kan kaempes fra start til slut.

Opgaver:
- Implementer CombatSystem (ren logik, ingen rendering)
- Implementer CombatScene (rendering af kampen)
- Alle 6 handlinger fungerer (2 angreb, forsvar, drik, 2 spells)
- Implementer fjende-AI (basic og aggressive typer)
- Implementer skadesformler
- Implementer HP/MP-visning i kamp
- Implementer sejr/nederlag-tilstande
- Kobl random encounters til overworld-bevaegelse (skridt-taaeller)
- Test med 2-3 placeholder-monstre

**Spilbart:** Teknisk ja. Man kan gaa rundt og kaempe. Men ingen progression, intet maal.

**Bevidst udeladt:** XP, levels, items, udstyr, rigtige maps.

### Fase 3: Progression (uge 5-6)

**Maal:** Spilleren bliver staerkere over tid. Der er udstyr og inventory.

Opgaver:
- Implementer CharacterSystem med XP og level-ups
- Implementer level-tabel med stat-stigninger
- Implementer InventorySystem
- Implementer udstyrssystem (equip/unequip, stat-bonusser)
- Implementer MenuScene (stats, inventory, equipment)
- Implementer shop-system (koeb items fra NPC)
- Implementer loot drops fra monstre
- Implementer consumables i kamp (helende drikke)
- Implementer save/load via localStorage

**Spilbart:** Ja. Nu er der en gameplay loop: udforsk, kaempe, bliv staerkere, koeb udstyr.

**Bevidst udeladt:** Rigtige maps, dialog, historie, polish.

### Fase 4: Indhold (uge 7-9)

**Maal:** Spillet har alt indhold fra start til slut.

Opgaver:
- Design og byg alle 5 maps i Tiled
- Implementer alle 6 monstertyper med stats og AI
- Implementer alle items og spells
- Implementer EventSystem med flags
- Skriv al dialog
- Implementer NPC-interaktion
- Implementer story-events (aeldstens intro, doende NPC, dragens hule)
- Implementer boss-kamp med fase 2
- Implementer slutskaerm/epilog
- Implementer TitleScene
- Foerste balanceringspass (er svaaerhedsgraden rigtig?)

**Spilbart:** Ja, komplet. Spillet kan spilles fra start til slut.

**Bevidst udeladt:** Polish, lyd, juice.

### Fase 5: Polish (uge 10-11)

**Maal:** Spillet foeles professionelt.

Opgaver:
- Screen shake ved store hits
- Flash-effekt naar spilleren tager skade
- Skadestal-tweens (tal der flyver op og fader)
- Kamp-start og -slut transitions
- Level-up visuel feedback
- Menu-cursor animation
- Game over skaerm med "Proev igen" (starter fra sidste save)
- Anden balanceringspass
- Bug fixes fra playtest
- Lydeffekter (svaerdslag, magi, menu-navigation, skridt) — brug gratis retro SFX
- Musik (valgfrit, lav prioritet): 1 landsby-track, 1 skov/bjerg-track, 1 kamp-track, 1 boss-track
- Final playtest

**Spilbart:** Ja, og det foeles faerdigt.

---

## 7. Kvalitetskriterier

### Spillet foeles faerdigt naar:

1. Man kan starte et nyt spil, spille hele vejen igennem, og se en slutskaerm
2. Der er ingen dead ends (steder man sidder fast uden mulighed for fremgang)
3. Man kan gemme og genoptage sit spil
4. Game over er haandteret (genstart fra save, ikke browser-refresh)
5. Al dialog er skrevet faerdigt (ingen placeholders)
6. Alle monstre, items og spells er implementerede og balancerede
7. Boss-kampen foeles som et klimaks (haardere end alt foer, men fair)

### Spillet foeles professionelt naar:

1. Visuelt konsekvent: Ingen mixed resolutions, ingen palette-brud, ensartet UI
2. Responsivt: Input foeles oejeblikkeligt. Ingen uforklarlige forsinkelser
3. Feedback paa alle handlinger: Tryk paa knap → noget sker visuelt/auditivt
4. Ingen synlige fejl: Ingen sprites der hopper, ingen overlappende tekst, ingen NaN i stats
5. Graceful failure: Hvis noget gaar galt, crasher spillet ikke — det haandterer fejlen
6. Titelskaerm og slutskaerm eksisterer og ser paene ud
7. Loading er haandteret (loading bar, ikke hvid skaerm)

### Spillet lever op til 90'er-aestetik naar:

1. Det ligner noget der kunne koere paa en SNES (oploesning, palette, sprite-stoerrelse)
2. UI-rammerne er genkendelige som JRPG-stil
3. Turbaseret kamp foelger JRPG-konventioner (spillerens tur, handlingsmenu, fjende reagerer)
4. Pixel art er konsekvent og rent (ingen anti-aliasing, ingen gradienter, ingen out-of-style elementer)
5. Animationer er faa men tidssvarende (walk cycle, kamp-effekter)

### Spillet lever op til moderne indie-forventninger naar:

1. Det koerer fejlfrit i Chrome, Firefox og Edge
2. Det skalerer korrekt til forskellige skaermstoerrrelser (nearest-neighbor, centered viewport)
3. Det kan spilles med tastatur (piletaster + Enter/Escape) og valgfrit mus
4. Save/load virker paalideligt
5. Det kan distribueres som en enkelt URL (ingen installation)

---

## 8. Anti-scope creep: 5 fristende features der IKKE skal med

### 1. Party system (flere spillbare karakterer)

Fristende fordi klassiske JRPG'er har det. Skadelig fordi:
- Mangedobler kampbalancering (handling per karakter per tur)
- Kraever party-menu, formation, individuel progression
- UI-kompleksiteten eksploderer (4 HP-barer, 4 handlingsmenuer)
- En enkelt helt med tydelig progression er staerkere narrativt for dette korte spil

### 2. Sidequests

Fristende fordi det foeler som "mere indhold". Skadelig fordi:
- Kraever quest-tracking system (quest log, objectives, completion states)
- Kraever ekstra dialog, events, flag-kombinationer
- Bryder den stramlinjede 30-60 minutters oplevelse
- Aflaeder fra main path-polish

### 3. Procedural map generation

Fristende fordi det giver "uendelig replayability". Skadelig fordi:
- Fjerner muligheden for haandlavet level design og pacing
- Kraever langt mere avanceret encounter balancering
- Proceduralt genererede maps foeles sjaaeldendt saa gode som haandlavede i et narrativt spil
- Massiv teknisk kompleksitet for minimal gameplay-vaerdi i et kort spil

### 4. Crafting system

Fristende fordi mange spil har det. Skadelig fordi:
- Kraever recipe-database, crafting-UI, material-items
- Underminerer shop-systemets rolle
- Tilfoejer inventory-bloat (materialer tager plads)
- Giver ingen narrativ vaerdi i dette spil

### 5. Animerede cutscenes

Fristende fordi det ville se imponerende ud. Skadelig fordi:
- Hvert sekund cutscene-animation koster timer af sprite-arbejde
- Dialogbokse med portratter fortaaeller historien lige saa effektivt
- 90'er SNES-spil brugte primaert tekst og simple sprite-bevaegelser til storytelling
- Risikerer at amatoeragtige cutscenes skader det professionelle indtryk mere end ingen cutscenes

---

## 9. Risici og afboedning

| Risiko | Sandsynlighed | Konsekvens | Afboedning |
|---|---|---|---|
| Asset-produktion tager for lang tid | Hoej | Forsinkelse af fase 4-5 | Brug placeholder art tidligt. Overveej gratis asset packs som udgangspunkt. |
| Kampbalancering er skaaev | Medium | Spillet er for let eller for svaert | Balancer i to passes (fase 4 og 5). Hold alle vaerdier i data-filer saa de nemt justeres. |
| Phaser-begransninger | Lav | Teknisk blocker | Phaser er velafproevet til dette scope. Minimal risiko. |
| Scope creep | Hoej | Spillet bliver aldrig faerdigt | Denne plan er scope-graensen. Nyt indhold tilfojes kun hvis alt i planen er faerdigt. |
| Motivation falder | Medium | Projektet opgives | Fase 2 giver en spilbar prototype. Tidlig "det virker!"-oplevelse holder motivationen. |

---

## 10. Opsummering

Spillet er et kort, komplet browser-RPG med et klart scope:

- 5 maps, 6 monstertyper, 9 items, 2 spells, 1 boss
- Turbaseret kamp med 6 handlinger
- Lineaer historie i 4 akter
- 10 levels af progression
- SNES-aaestetik med 16x16 tiles
- Phaser 3 + TypeScript
- 11 ugers udviklingsplan i 5 faser

Den stoerste trussel mod projektet er ikke teknisk kompleksitet — det er scope creep. Alt i denne plan er tilstraekkeligt til et professionelt, faerdigt spil. Modstaa fristelsen til at tilfoeje mere.
