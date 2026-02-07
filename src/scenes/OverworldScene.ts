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

  // NPCs
  private npcs: NPC[] = [];
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  constructor() {
    super({ key: 'OverworldScene' });
  }

  create(): void {
    console.log('OverworldScene: Starting...');

    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();

    // Create test map
    this.createTestMap();
    this.renderMap();

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
    // Scale 64x64 sprite down to fit 16x16 tile (or use 0.375 for 24x24)
    this.player.setScale(0.375); // 64 * 0.375 = 24px
    this.player.play('player_idle_down'); // Start with idle animation

    // Spawn NPCs for current map
    this.spawnNPCs();

    // Setup camera
    this.setupCamera();

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);

    console.log(`Player spawned at grid (${this.playerGridX}, ${this.playerGridY})`);
  }

  update(): void {
    this.inputService.update();

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

    // Check collision with walls
    if (this.tilemap[targetY][targetX] === this.TILE_WALL) {
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

        // Check for random encounter
        this.checkForEncounter();

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
   * Create a simple test map
   * 0 = walkable ground
   * 1 = wall
   */
  private createTestMap(): void {
    this.tilemap = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around the edges
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === 0 || y === this.MAP_HEIGHT - 1) {
          row.push(this.TILE_WALL);
        }
        // Create some random obstacles
        else if (Math.random() < 0.1) {
          row.push(this.TILE_WALL);
        }
        // Otherwise ground
        else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
  }

  /**
   * Render the tilemap using real tile sprites
   */
  private renderMap(): void {
    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        const tileType = this.tilemap[y][x];
        // Use real tile sprites: grass for ground, placeholder for walls (fallback)
        const textureName = tileType === this.TILE_WALL ? 'tile_wall' : 'grass_tile';

        const tile = this.add.sprite(
          x * this.TILE_SIZE,
          y * this.TILE_SIZE,
          textureName
        );
        tile.setOrigin(0, 0);
        tile.setDepth(0); // Behind player
      }
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
      // Scale 64x64 sprite down to 24x24 (0.375x)
      sprite.setScale(0.375);

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
   * Cleanup når scene lukkes
   */
  shutdown(): void {
    this.inputService.destroy();
    this.npcSprites.forEach(sprite => sprite.destroy());
    this.npcSprites.clear();
  }
}
