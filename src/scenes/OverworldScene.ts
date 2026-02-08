import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';
import { generateEncounter, createMonster } from '@/data/monsters';
import { getShop } from '@/data/shops';
import { getNPCsForMap } from '@/data/npcs';
import { getDialog } from '@/data/dialogs';
import { EventSystem } from '@/systems/EventSystem';
import type { Direction, DialogEntry, NPC } from '@/types';

/**
 * OverworldScene - Hovedscene hvor spilleren bevæger sig rundt
 *
 * Features:
 * - Grid-baseret bevægelse (16x16 tiles)
 * - Smooth interpolation mellem tiles
 * - Kollision med blocked tiles
 * - Kamera følger spilleren
 */
export class OverworldScene extends Phaser.Scene {
  private inputService!: InputService;
  private gameState!: GameStateManager;

  // Player
  private player!: Phaser.GameObjects.Sprite;
  private playerGridX: number = 8;
  private playerGridY: number = 8;

  // Movement
  private isMoving: boolean = false;
  private moveDuration: number = 150; // ms per tile movement
  private queuedDirection: Direction | null = null;

  // Map
  private readonly TILE_SIZE = 16;
  private readonly MAP_WIDTH = 20;
  private readonly MAP_HEIGHT = 15;
  private tilemap: number[][] = [];

  // Tile types
  private readonly TILE_GROUND = 0;
  private readonly TILE_WALL = 1;
  private readonly TILE_CLIFF_LARGE = 2;  // 3x3 cliff (blocks 9 tiles)
  private readonly TILE_CLIFF_SMALL = 3;  // 2x2 cliff (blocks 4 tiles)

  // NPCs
  private npcs: NPC[] = [];
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  // Debug
  private coordinateText!: Phaser.GameObjects.Text;

  // Cliff data (stored separately for proper rendering)
  private cliffs: Array<{ x: number; y: number; size: 'large' | 'small' }> = [];

  // Decorations (animals, house, etc.)
  private decorations: Array<{ sprite: Phaser.GameObjects.Sprite; shopId?: string }> = [];

  // Map transitions (portals/doors)
  private mapTransitions: Array<{ x: number; y: number; targetMap: string; targetX: number; targetY: number }> = [];

  constructor() {
    super({ key: 'OverworldScene' });
  }

  create(): void {
    console.log('OverworldScene: Starting...');

    // Reset movement state
    this.isMoving = false;
    this.queuedDirection = null;

    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();

    // Create test map
    this.createTestMap();
    this.renderMap();
    this.placeDecorations();

    // Create player
    const savedPos = this.gameState.getState().playerPosition;
    this.playerGridX = savedPos.x;
    this.playerGridY = savedPos.y;

    this.player = this.add.sprite(
      this.playerGridX * this.TILE_SIZE,
      this.playerGridY * this.TILE_SIZE,
      'player'
    );
    this.player.setOrigin(0, 0);
    this.player.setDepth(10); // Above tiles
    // 32x32 sprites at 0.5x scale = 16x16 (fits tile grid perfectly)
    this.player.setScale(0.5);
    this.player.play('player_idle_down'); // Start with idle animation

    // Spawn NPCs for current map
    this.spawnNPCs();

    // Setup camera
    this.setupCamera();

    // Create coordinate display (top-left corner, fixed to camera)
    this.coordinateText = this.add.text(5, 5, '', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    });
    this.coordinateText.setScrollFactor(0); // Fixed to camera
    this.coordinateText.setDepth(1000); // Always on top
    this.updateCoordinateDisplay();

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);

    console.log(`Player spawned at grid (${this.playerGridX}, ${this.playerGridY})`);
  }

  update(): void {
    this.inputService.update();
    this.updateCoordinateDisplay();

    // DEBUG: Test boss fight (press D for dragon)
    const keyD = this.input.keyboard?.addKey('D');
    if (keyD && Phaser.Input.Keyboard.JustDown(keyD)) {
      this.startBossFight();
      return;
    }

    // DEBUG: Test shop (press S for shop)
    const keyS = this.input.keyboard?.addKey('S');
    if (keyS && Phaser.Input.Keyboard.JustDown(keyS)) {
      this.openShop();
      return;
    }

    // DEBUG: Test combat (press C for combat)
    const keyC = this.input.keyboard?.addKey('C');
    if (keyC && Phaser.Input.Keyboard.JustDown(keyC)) {
      this.checkForEncounter();
      return;
    }

    // Open menu (press ESC or M)
    if (this.inputService.justPressed('cancel') || this.inputService.justPressed('menu')) {
      // Check if MenuScene is not already running
      if (!this.scene.isActive('MenuScene')) {
        this.scene.launch('MenuScene');
      }
      return;
    }

    // Interact with NPCs (press Enter/Space)
    if (this.inputService.justPressed('action') && !this.isMoving) {
      // Check if DialogScene is already running
      if (!this.scene.isActive('DialogScene')) {
        this.tryInteract();
      }
      return;
    }

    // Handle movement
    if (!this.isMoving) {
      const direction = this.inputService.getDirection();

      if (direction) {
        this.tryMove(direction);
      }
    }
  }

  /**
   * Forsøg at bevæge spilleren i en retning
   */
  private tryMove(direction: Direction): void {
    // Calculate target grid position
    let targetX = this.playerGridX;
    let targetY = this.playerGridY;

    switch (direction) {
      case 'up':
        targetY--;
        break;
      case 'down':
        targetY++;
        break;
      case 'left':
        targetX--;
        break;
      case 'right':
        targetX++;
        break;
    }

    // Check bounds
    if (targetX < 0 || targetX >= this.MAP_WIDTH || targetY < 0 || targetY >= this.MAP_HEIGHT) {
      return; // Out of bounds
    }

    // Check collision with walls and cliffs
    const tileType = this.tilemap[targetY][targetX];
    if (tileType === this.TILE_WALL || tileType === this.TILE_CLIFF_LARGE || tileType === this.TILE_CLIFF_SMALL) {
      return; // Blocked
    }

    // Check collision with NPCs
    if (this.getNPCAt(targetX, targetY)) {
      return; // Blocked by NPC
    }

    // Start movement
    this.moveToTile(targetX, targetY, direction);
  }

  /**
   * Bevæg spilleren til et specifikt tile med smooth animation
   */
  private moveToTile(gridX: number, gridY: number, direction: Direction): void {
    this.isMoving = true;

    // Handle flipX for left/right directions
    if (direction === 'left') {
      this.player.setFlipX(true);
    } else if (direction === 'right') {
      this.player.setFlipX(false);
    }

    // Play walking animation based on direction
    const walkAnimKey = `player_walk_${direction}`;
    if (this.anims.exists(walkAnimKey)) {
      this.player.play(walkAnimKey);
    }

    const targetPixelX = gridX * this.TILE_SIZE;
    const targetPixelY = gridY * this.TILE_SIZE;

    // Animate movement
    this.tweens.add({
      targets: this.player,
      x: targetPixelX,
      y: targetPixelY,
      duration: this.moveDuration,
      ease: 'Linear',
      onComplete: () => {
        this.isMoving = false;
        this.playerGridX = gridX;
        this.playerGridY = gridY;

        // Play idle animation
        const idleAnimKey = `player_idle_${direction}`;
        if (this.anims.exists(idleAnimKey)) {
          this.player.play(idleAnimKey);
        }

        // Save position
        this.gameState.setPlayerPosition(gridX, gridY);

        // Increment encounter steps
        this.gameState.incrementEncounterSteps();

        // Check for random encounter (DISABLED FOR TESTING - use 'C' key instead)
        // this.checkForEncounter();

        // Check for map transitions
        this.checkForMapTransition();

        // Check for queued direction
        if (this.queuedDirection) {
          const dir = this.queuedDirection;
          this.queuedDirection = null;
          this.tryMove(dir);
        }
      }
    });
  }

  /**
   * Setup kamera til at følge spilleren
   */
  private setupCamera(): void {
    const cam = this.cameras.main;

    // Set world bounds
    cam.setBounds(
      0,
      0,
      this.MAP_WIDTH * this.TILE_SIZE,
      this.MAP_HEIGHT * this.TILE_SIZE
    );

    // Follow player (with deadzone)
    cam.startFollow(this.player, true, 0.1, 0.1);

    // Set zoom (1x for pixel-perfect)
    cam.setZoom(1);
  }

  /**
   * Create map based on current map ID
   */
  private createTestMap(): void {
    const currentMap = this.gameState.getState().currentMap;

    if (currentMap === 'house_interior') {
      this.createHouseInteriorMap();
    } else {
      this.createVillageMap();
    }
  }

  /**
   * Create the village map (outdoor)
   */
  private createVillageMap(): void {
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around the edges
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === 0 || y === this.MAP_HEIGHT - 1) {
          row.push(this.TILE_WALL);
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;

    // Place some cliff obstacles
    this.placeCliff(4, 3, 'large');
    this.placeCliff(13, 5, 'small');
    this.placeCliff(10, 9, 'large');

    // Block tiles where house is (3x4 tiles at position 16,4)
    // House is at (16, 4), size 3x4 tiles
    for (let y = 4; y < 8; y++) {
      for (let x = 16; x < 19; x++) {
        // Leave door open at (17, 7) for entrance
        if (!(x === 17 && y === 7)) {
          this.tilemap[y][x] = this.TILE_WALL;
        }
      }
    }

    // Add map transition at house door (bottom center of house)
    // House is at (16, 4), size 3x4 tiles, so door is at center bottom: (17, 7)
    this.mapTransitions.push({
      x: 17,
      y: 7,
      targetMap: 'house_interior',
      targetX: 10,
      targetY: 11  // Spawn just north of the exit door
    });
  }

  /**
   * Create house interior map
   */
  private createHouseInteriorMap(): void {
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Walls on all edges
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === 0 || y === this.MAP_HEIGHT - 1) {
          row.push(this.TILE_WALL);
        }
        // Interior wall to create two rooms, with door at (10, 13)
        else if (x === 10 && y > 3 && y < this.MAP_HEIGHT - 1 && y !== 13) {
          row.push(this.TILE_WALL);
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Exit door at (10, 13) - go back to village when standing on it
    this.mapTransitions.push({
      x: 10,
      y: 13,
      targetMap: 'village',
      targetX: 17,
      targetY: 8
    });
  }

  /**
   * Place a cliff obstacle on the map
   * @param startX Top-left X position
   * @param startY Top-left Y position
   * @param size 'large' (3x3) or 'small' (2x2)
   */
  private placeCliff(startX: number, startY: number, size: 'large' | 'small'): void {
    const tileType = size === 'large' ? this.TILE_CLIFF_LARGE : this.TILE_CLIFF_SMALL;
    const cliffSize = size === 'large' ? 3 : 2;

    // Store cliff data for rendering
    this.cliffs.push({ x: startX, y: startY, size });

    // Mark tiles as blocked for collision
    for (let y = 0; y < cliffSize; y++) {
      for (let x = 0; x < cliffSize; x++) {
        const tileX = startX + x;
        const tileY = startY + y;

        // Make sure we're within bounds
        if (tileX >= 0 && tileX < this.MAP_WIDTH && tileY >= 0 && tileY < this.MAP_HEIGHT) {
          this.tilemap[tileY][tileX] = tileType;
        }
      }
    }
  }

  /**
   * Render the tilemap using real tile sprites
   */
  private renderMap(): void {
    // First, render all ground and wall tiles
    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        const tileType = this.tilemap[y][x];

        // Skip cliff tiles - they'll be rendered separately
        if (tileType === this.TILE_CLIFF_LARGE || tileType === this.TILE_CLIFF_SMALL) {
          // Render grass underneath cliffs
          const tile = this.add.sprite(
            x * this.TILE_SIZE,
            y * this.TILE_SIZE,
            'grass_tile'
          );
          tile.setOrigin(0, 0);
          tile.setDepth(0);
          continue;
        }

        // Use real tile sprites: grass for ground, farmland for walls
        const textureName = tileType === this.TILE_WALL ? 'farmland_tile' : 'grass_tile';

        const tile = this.add.sprite(
          x * this.TILE_SIZE,
          y * this.TILE_SIZE,
          textureName
        );
        tile.setOrigin(0, 0);
        tile.setDepth(0); // Behind player
      }
    }

    // Then render all cliffs on top using stored cliff data
    this.cliffs.forEach(cliff => {
      this.renderCliffTiles(cliff.x, cliff.y, cliff.size);
    });
  }

  /**
   * Render a cliff (large 3x3 or small 2x2) using tileset frames
   * @param startX Top-left X position of cliff
   * @param startY Top-left Y position of cliff
   * @param cliffSize 'large' (3x3) or 'small' (2x2)
   */
  private renderCliffTiles(startX: number, startY: number, cliffSize: 'large' | 'small'): void {
    const isLarge = cliffSize === 'large';
    const size = isLarge ? 3 : 2;
    const baseFrame = isLarge ? 0 : 9; // Large cliff: frames 0-8, Small cliff: frames 9,10,12,13
    const spriteSheetWidth = 3; // Cliff_Tile.png is 3 tiles wide

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const tileX = startX + x;
        const tileY = startY + y;
        // Use spritesheet width (3) instead of cliff size for frame calculation
        const frameIndex = baseFrame + (y * spriteSheetWidth) + x;

        const tile = this.add.sprite(
          tileX * this.TILE_SIZE,
          tileY * this.TILE_SIZE,
          'cliff_tileset',
          frameIndex
        );
        tile.setOrigin(0, 0);
        tile.setDepth(1); // Above ground tiles but below player
      }
    }
  }

  /**
   * Place decorations (animals, house, etc.)
   */
  private placeDecorations(): void {
    // Clear any existing decorations
    this.decorations.forEach(deco => deco.sprite.destroy());
    this.decorations = [];

    const currentMap = this.gameState.getState().currentMap;

    // Only place outdoor decorations on village map
    if (currentMap === 'village') {
      // Place house (96x128 at 0.5x = 48x64 pixels = 3x4 tiles) at position (16, 4)
      const house = this.add.sprite(
        16 * this.TILE_SIZE,
        4 * this.TILE_SIZE,
        'house_wood'
      );
      house.setOrigin(0, 0);
      house.setDepth(5); // Above ground, below player
      house.setScale(0.5); // 96x128 at 0.5x = 48x64
      this.decorations.push({ sprite: house, shopId: 'village_shop' });

      // Place animals
      const animalPositions = [
        { key: 'cow', x: 3, y: 3 },
        { key: 'pig', x: 6, y: 3 },
        { key: 'chicken', x: 3, y: 6 },
        { key: 'sheep', x: 6, y: 6 }
      ];

      animalPositions.forEach(({ key, x, y }) => {
        const animal = this.add.sprite(
          x * this.TILE_SIZE,
          y * this.TILE_SIZE,
          key,
          0  // Use frame 0 (first frame of the spritesheet)
        );
        animal.setOrigin(0, 0);
        animal.setDepth(5);
        animal.setScale(0.5); // 32x32 at 0.5x = 16x16
        this.decorations.push({ sprite: animal });
      });
    }
    // House interior decorations could be added here
    else if (currentMap === 'house_interior') {
      // TODO: Add interior furniture, shopkeeper counter, etc.
    }
  }

  /**
   * Check if player is on a map transition and handle it
   */
  private checkForMapTransition(): void {
    const transition = this.mapTransitions.find(
      t => t.x === this.playerGridX && t.y === this.playerGridY
    );

    if (transition) {
      console.log(`Map transition: ${this.gameState.getState().currentMap} -> ${transition.targetMap}`);

      // Fade out
      this.cameras.main.fadeOut(300, 0, 0, 0);

      this.cameras.main.once('camerafadeoutcomplete', () => {
        // Update map and position
        this.gameState.getState().currentMap = transition.targetMap;
        this.gameState.setPlayerPosition(transition.targetX, transition.targetY);

        // Restart the scene to load new map
        this.scene.restart();
      });
    }
  }

  /**
   * Check om der skal være et random encounter
   */
  private checkForEncounter(): void {
    const encounterSteps = this.gameState.getState().encounterSteps;

    // Encounter threshold: 5-10 skridt
    const minSteps = 5;
    const maxSteps = 10;

    if (encounterSteps < minSteps) {
      return; // For tidligt
    }

    // Beregn sandsynlighed baseret på antal skridt
    const chance = Math.min(0.3, (encounterSteps - minSteps) / (maxSteps - minSteps) * 0.3);

    if (Math.random() < chance) {
      this.startEncounter();
    }
  }

  /**
   * Start en random encounter
   */
  private startEncounter(): void {
    console.log('Encounter triggered!');

    // Reset encounter counter
    this.gameState.resetEncounterSteps();

    // Generate enemies (for now, use forest_north table)
    const enemies = generateEncounter('forest_north');

    // Pause OverworldScene (men stop den ikke - vi kommer tilbage)
    this.scene.pause();

    // Start CombatScene med enemies
    this.scene.launch('CombatScene', { enemies });
  }

  /**
   * DEBUG: Start boss fight mod dragen
   */
  private startBossFight(): void {
    console.log('DEBUG: Boss fight started!');

    // Create dragon
    const dragon = createMonster('red_dragon');

    // Pause OverworldScene
    this.scene.pause();

    // Start CombatScene med dragon
    this.scene.launch('CombatScene', { enemies: [dragon] });
  }

  /**
   * DEBUG: Åbn shop
   */
  private openShop(): void {
    console.log('DEBUG: Shop opened!');

    const shop = getShop('village_shop');

    if (!shop) {
      console.error('Shop not found!');
      return;
    }

    // Launch ShopScene
    this.scene.launch('ShopScene', { shop });
  }

  /**
   * Spawn NPCs for current map
   */
  private spawnNPCs(): void {
    const currentMap = this.gameState.getState().currentMap;
    const eventFlags = this.gameState.getEventFlags();

    // Get NPCs for this map
    this.npcs = getNPCsForMap(currentMap);

    // Filter NPCs based on conditions
    this.npcs = this.npcs.filter(npc => {
      if (!npc.condition) return true;
      return EventSystem.checkCondition(eventFlags, npc.condition);
    });

    // Spawn NPC sprites
    this.npcs.forEach(npc => {
      const sprite = this.add.sprite(
        npc.tileX * this.TILE_SIZE,
        npc.tileY * this.TILE_SIZE,
        'player' // Use player sprite for NPCs
      );
      sprite.setOrigin(0, 0);
      sprite.setDepth(9); // Just below player
      // 32x32 sprites at 0.5x scale = 16x16
      sprite.setScale(0.5);

      // Different tints for different NPCs to distinguish them
      const npcTints: Record<string, number> = {
        village_elder: 0xcccccc,    // Gray
        guard: 0x4444ff,            // Blue
        shopkeeper: 0xffaa00,       // Orange
        blacksmith: 0x8b4513,       // Brown
        healer: 0xff88ff,           // Pink
        mysterious_stranger: 0x8800ff // Purple
      };

      const tint = npcTints[npc.id] || 0x00ff00;
      sprite.setTint(tint);

      // Play idle animation
      if (this.anims.exists('player_idle_down')) {
        sprite.play('player_idle_down');
      }

      this.npcSprites.set(npc.id, sprite);
    });

    console.log(`Spawned ${this.npcs.length} NPCs`);
  }

  /**
   * Try to interact with NPC in front of player
   */
  private tryInteract(): void {
    // First check for decorations with shops (like the house)
    const decoration = this.getInteractableDecoration();
    if (decoration && decoration.shopId) {
      const shop = getShop(decoration.shopId);
      if (shop) {
        this.scene.launch('ShopScene', { shop });
        return;
      }
    }

    // Check all 4 directions for NPCs
    const directions: Direction[] = ['up', 'down', 'left', 'right'];

    for (const direction of directions) {
      let checkX = this.playerGridX;
      let checkY = this.playerGridY;

      switch (direction) {
        case 'up':
          checkY--;
          break;
        case 'down':
          checkY++;
          break;
        case 'left':
          checkX--;
          break;
        case 'right':
          checkX++;
          break;
      }

      const npc = this.getNPCAt(checkX, checkY);
      if (npc) {
        this.interactWithNPC(npc);
        return;
      }
    }

    console.log('No NPC nearby to interact with');
  }

  /**
   * Get interactable decoration near player
   */
  private getInteractableDecoration(): { sprite: Phaser.GameObjects.Sprite; shopId?: string } | null {
    // Check if player is adjacent to any decoration with a shopId
    for (const deco of this.decorations) {
      if (!deco.shopId) continue;

      const decoX = deco.sprite.x / this.TILE_SIZE;
      const decoY = deco.sprite.y / this.TILE_SIZE;
      const decoWidth = (deco.sprite.width * deco.sprite.scaleX) / this.TILE_SIZE;
      const decoHeight = (deco.sprite.height * deco.sprite.scaleY) / this.TILE_SIZE;

      // Check if player is adjacent to this decoration
      // Player is at (playerGridX, playerGridY)
      // Decoration spans from (decoX, decoY) to (decoX + decoWidth, decoY + decoHeight)

      // Check all adjacent positions
      for (let dy = -1; dy <= decoHeight; dy++) {
        for (let dx = -1; dx <= decoWidth; dx++) {
          const checkX = Math.floor(decoX + dx);
          const checkY = Math.floor(decoY + dy);

          if (checkX === this.playerGridX && checkY === this.playerGridY) {
            return deco;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get NPC at specific grid position
   */
  private getNPCAt(gridX: number, gridY: number): NPC | null {
    return this.npcs.find(npc => npc.tileX === gridX && npc.tileY === gridY) || null;
  }

  /**
   * Interact with an NPC
   */
  private interactWithNPC(npc: NPC): void {
    console.log(`Interacting with ${npc.name}`);

    // Check if NPC has a shop
    if (npc.shopId) {
      const shop = getShop(npc.shopId);
      if (shop) {
        this.scene.launch('ShopScene', { shop });
        return;
      }
    }

    // Show NPC dialog
    const dialog = getDialog(npc.dialog);
    if (!dialog) {
      console.error(`Dialog ${npc.dialog} not found!`);
      return;
    }

    this.scene.launch('DialogScene', {
      dialog: dialog,
      onComplete: () => {
        // Set event flag if dialog has one
        if (dialog.setsFlag) {
          this.gameState.setEventFlag(dialog.setsFlag, true);
        }

        // Refresh NPCs (in case flags changed visibility)
        this.refreshNPCs();
      }
    });
  }

  /**
   * Refresh NPCs (after event flags change)
   */
  private refreshNPCs(): void {
    // Clear existing NPC sprites
    this.npcSprites.forEach(sprite => sprite.destroy());
    this.npcSprites.clear();

    // Respawn NPCs
    this.spawnNPCs();
  }

  /**
   * Update coordinate display
   */
  private updateCoordinateDisplay(): void {
    this.coordinateText.setText(`X: ${this.playerGridX}, Y: ${this.playerGridY}`);
  }

  /**
   * Cleanup når scene lukkes
   */
  shutdown(): void {
    // Stop all tweens
    this.tweens.killAll();

    // Reset movement state
    this.isMoving = false;
    this.queuedDirection = null;

    // Destroy input service
    if (this.inputService) {
      this.inputService.destroy();
    }

    // Clean up NPCs
    this.npcSprites.forEach(sprite => sprite.destroy());
    this.npcSprites.clear();

    // Clean up decorations
    this.decorations.forEach(deco => deco.sprite.destroy());
    this.decorations = [];
  }
}
