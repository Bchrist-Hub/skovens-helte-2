import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';
import { generateEncounter, createMonster } from '@/data/monsters';
import { getShop } from '@/data/shops';
import type { Direction, DialogEntry } from '@/types';

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
      'player_placeholder'
    );
    this.player.setOrigin(0, 0);
    this.player.setDepth(10); // Above tiles

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

    // Test dialog (press T)
    if (this.inputService.justPressed('action') && !this.isMoving) {
      // Check if DialogScene is already running
      if (!this.scene.isActive('DialogScene')) {
        this.showTestDialog();
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
   * Test dialog - viser en eksempel-dialog
   */
  private showTestDialog(): void {
    const testDialog: DialogEntry = {
      id: 'test_dialog',
      speaker: 'Ældsten',
      lines: [
        'Velkommen til Skovens Helte!',
        'Dette er en test-dialog med typewriter-effekt.',
        'Tryk ENTER for at fortsætte til næste linje.'
      ]
    };

    // Launch DialogScene som overlay med dialog data
    this.scene.launch('DialogScene', {
      dialog: testDialog,
      onComplete: () => {
        console.log('Dialog completed!');
      }
    });
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

    // Check collision
    if (this.tilemap[targetY][targetX] === this.TILE_WALL) {
      return; // Blocked
    }

    // Start movement
    this.moveToTile(targetX, targetY);
  }

  /**
   * Bevæg spilleren til et specifikt tile med smooth animation
   */
  private moveToTile(gridX: number, gridY: number): void {
    this.isMoving = true;

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
   * Render the tilemap using placeholder graphics
   */
  private renderMap(): void {
    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        const tileType = this.tilemap[y][x];
        const textureName = tileType === this.TILE_WALL ? 'tile_wall' : 'tile_ground';

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
   * Cleanup når scene lukkes
   */
  shutdown(): void {
    this.inputService.destroy();
  }
}
