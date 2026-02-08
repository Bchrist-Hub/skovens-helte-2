import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';
import { generateEncounter, createMonster } from '@/data/monsters';
import { getShop } from '@/data/shops';
import { getNPCsForMap } from '@/data/npcs';
import { getDialog } from '@/data/dialogs';
import { EventSystem } from '@/systems/EventSystem';
import type { Direction, NPC } from '@/types';

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
  private MAP_WIDTH = 20; // Not readonly - varies by map
  private MAP_HEIGHT = 15; // Not readonly - varies by map
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

  // Play time tracking
  private accumulatedTime: number = 0; // Milliseconds accumulated

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

    // Track play time (increment every second)
    const delta = this.game.loop.delta; // Milliseconds since last frame
    this.accumulatedTime += delta;

    if (this.accumulatedTime >= 1000) {
      // Increment play time by 1 second
      const state = this.gameState.getState();
      state.playTime += 1;
      this.accumulatedTime -= 1000; // Keep remainder for precision
    }

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
        // Pause OverworldScene to prevent movement during menu
        this.scene.pause();

        this.scene.launch('MenuScene', {
          onComplete: () => {
            // Resume OverworldScene after menu closes
            this.scene.resume();
          }
        });
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

        // Check for random encounter (only on maps with encounters)
        this.checkForEncounter();

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

    switch (currentMap) {
      case 'house_interior':
        this.createHouseInteriorMap();
        break;
      case 'inn_interior':
        this.createInnInteriorMap();
        break;
      case 'blacksmith_interior':
        this.createBlacksmithInteriorMap();
        break;
      case 'elder_house_interior':
        this.createElderHouseInteriorMap();
        break;
      case 'village_outskirts':
        this.createVillageOutskirtsMap();
        break;
      case 'forest_path':
        this.createForestPathMap();
        break;
      case 'dark_forest':
        this.createDarkForestMap();
        break;
      case 'mountain_path':
        this.createMountainPathMap();
        break;
      case 'mountain_cave':
        this.createMountainCaveMap();
        break;
      case 'dragon_lair_entrance':
        this.createDragonLairEntranceMap();
        break;
      case 'dragon_arena':
        this.createDragonArenaMap();
        break;
      case 'village':
      default:
        this.createVillageMap();
        break;
    }
  }

  /**
   * Create the village map (outdoor)
   */
  private createVillageMap(): void {
    this.MAP_WIDTH = 20;
    this.MAP_HEIGHT = 15;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around the edges (except north exit)
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === this.MAP_HEIGHT - 1) {
          row.push(this.TILE_WALL);
        } else if (y === 0) {
          // North edge - open path in middle for transition
          if (x >= 9 && x <= 11) {
            row.push(this.TILE_GROUND); // Open path north
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear (only if within bounds)
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Place some cliff obstacles
    this.placeCliff(4, 3, 'large');
    this.placeCliff(13, 5, 'small');
    this.placeCliff(10, 9, 'large');

    // Block tiles where buildings are (3x4 tiles each)

    // Shop/House (right side): (16, 4), size 3x4 tiles
    for (let y = 4; y < 8; y++) {
      for (let x = 16; x < 19; x++) {
        // Leave door open at (17, 7) for entrance
        if (!(x === 17 && y === 7)) {
          this.tilemap[y][x] = this.TILE_WALL;
        }
      }
    }

    // Blacksmith (middle right): (12, 4), size 3x4 tiles
    for (let y = 4; y < 8; y++) {
      for (let x = 12; x < 15; x++) {
        // Leave door open at (13, 7) for entrance
        if (!(x === 13 && y === 7)) {
          this.tilemap[y][x] = this.TILE_WALL;
        }
      }
    }

    // Inn (left side): (3, 4), size 3x4 tiles
    for (let y = 4; y < 8; y++) {
      for (let x = 3; x < 6; x++) {
        // Leave door open at (4, 7) for entrance
        if (!(x === 4 && y === 7)) {
          this.tilemap[y][x] = this.TILE_WALL;
        }
      }
    }

    // Elder's House (top center): (9, 2), size 3x3 tiles (smaller)
    for (let y = 2; y < 5; y++) {
      for (let x = 9; x < 12; x++) {
        // Leave door open at (10, 4) for entrance
        if (!(x === 10 && y === 4)) {
          this.tilemap[y][x] = this.TILE_WALL;
        }
      }
    }

    // Map transitions (doors to buildings)

    // Shop/House door
    this.mapTransitions.push({
      x: 17,
      y: 7,
      targetMap: 'house_interior',
      targetX: 10,
      targetY: 13
    });

    // Blacksmith door
    this.mapTransitions.push({
      x: 13,
      y: 7,
      targetMap: 'blacksmith_interior',
      targetX: 10,
      targetY: 11
    });

    // Inn door
    this.mapTransitions.push({
      x: 4,
      y: 7,
      targetMap: 'inn_interior',
      targetX: 10,
      targetY: 11
    });

    // Elder's House door
    this.mapTransitions.push({
      x: 10,
      y: 4,
      targetMap: 'elder_house_interior',
      targetX: 7,
      targetY: 9
    });

    // North exit to Village Outskirts
    this.mapTransitions.push({
      x: 10,
      y: 0,
      targetMap: 'village_outskirts',
      targetX: 12,
      targetY: 18
    });
  }

  /**
   * Create village outskirts map (transition area)
   */
  private createVillageOutskirtsMap(): void {
    this.MAP_WIDTH = 25;
    this.MAP_HEIGHT = 20;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around edges (except south back to village, north to forest)
        if (x === 0 || x === this.MAP_WIDTH - 1) {
          row.push(this.TILE_WALL);
        } else if (y === 0) {
          // North edge - open path to forest (future)
          if (x >= 11 && x <= 14) {
            row.push(this.TILE_GROUND); // Open path north (to forest)
          } else {
            row.push(this.TILE_WALL);
          }
        } else if (y === this.MAP_HEIGHT - 1) {
          // South edge - open path back to village
          if (x >= 11 && x <= 13) {
            row.push(this.TILE_GROUND); // Open path south (to village)
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear (only if within bounds)
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Place some obstacles (cliffs and small cliff groupings)
    this.placeCliff(6, 5, 'small');
    this.placeCliff(18, 8, 'small');
    this.placeCliff(10, 12, 'large');

    // South exit back to Village
    this.mapTransitions.push({
      x: 12,
      y: this.MAP_HEIGHT - 1,
      targetMap: 'village',
      targetX: 10,
      targetY: 1
    });

    // North exit to Forest Path
    this.mapTransitions.push({
      x: 12,
      y: 0,
      targetMap: 'forest_path',
      targetX: 15,
      targetY: 18
    });
  }

  /**
   * Create forest path map
   */
  private createForestPathMap(): void {
    this.MAP_WIDTH = 30;
    this.MAP_HEIGHT = 20;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around edges (except south to outskirts, north to dark forest)
        if (x === 0 || x === this.MAP_WIDTH - 1) {
          row.push(this.TILE_WALL);
        } else if (y === 0) {
          // North edge - open path to dark forest (future)
          if (x === 15) {
            row.push(this.TILE_GROUND); // Open path north
          } else {
            row.push(this.TILE_WALL);
          }
        } else if (y === this.MAP_HEIGHT - 1) {
          // South edge - open path back to village outskirts
          if (x === 15) {
            row.push(this.TILE_GROUND); // Open path south
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Create a winding path with obstacles (cliffs) on both sides
    // Left side obstacles
    this.placeCliff(3, 3, 'large');
    this.placeCliff(2, 7, 'small');
    this.placeCliff(4, 11, 'large');
    this.placeCliff(3, 15, 'small');

    // Right side obstacles
    this.placeCliff(24, 2, 'small');
    this.placeCliff(25, 6, 'large');
    this.placeCliff(23, 10, 'small');
    this.placeCliff(24, 14, 'large');

    // Center path obstacles to create winding effect
    this.placeCliff(10, 5, 'small');
    this.placeCliff(18, 8, 'small');
    this.placeCliff(12, 12, 'large');
    this.placeCliff(20, 15, 'small');

    // South exit back to Village Outskirts
    this.mapTransitions.push({
      x: 15,
      y: this.MAP_HEIGHT - 1,
      targetMap: 'village_outskirts',
      targetX: 12,
      targetY: 1
    });

    // North exit to Dark Forest
    this.mapTransitions.push({
      x: 15,
      y: 0,
      targetMap: 'dark_forest',
      targetX: 12,
      targetY: 23
    });
  }

  /**
   * Create house interior map
   */
  private createHouseInteriorMap(): void {
    this.MAP_WIDTH = 20;
    this.MAP_HEIGHT = 15;
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
   * Create inn interior map
   */
  private createInnInteriorMap(): void {
    this.MAP_WIDTH = 20;
    this.MAP_HEIGHT = 15;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Walls on all edges
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === 0 || y === this.MAP_HEIGHT - 1) {
          row.push(this.TILE_WALL);
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Exit door at center bottom
    this.mapTransitions.push({
      x: 10,
      y: 13,
      targetMap: 'village',
      targetX: 5,
      targetY: 8
    });
  }

  /**
   * Create blacksmith interior map
   */
  private createBlacksmithInteriorMap(): void {
    this.MAP_WIDTH = 20;
    this.MAP_HEIGHT = 15;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Walls on all edges
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === 0 || y === this.MAP_HEIGHT - 1) {
          row.push(this.TILE_WALL);
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Exit door at center bottom
    this.mapTransitions.push({
      x: 10,
      y: 13,
      targetMap: 'village',
      targetX: 14,
      targetY: 8
    });
  }

  /**
   * Create elder's house interior map
   */
  private createElderHouseInteriorMap(): void {
    this.MAP_WIDTH = 15;
    this.MAP_HEIGHT = 12;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Walls on all edges
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === 0 || y === this.MAP_HEIGHT - 1) {
          row.push(this.TILE_WALL);
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Exit door at center bottom
    this.mapTransitions.push({
      x: 7,
      y: 10,
      targetMap: 'village',
      targetX: 10,
      targetY: 6
    });
  }

  /**
   * Create dark forest map (dangerous area with goblins)
   */
  private createDarkForestMap(): void {
    this.MAP_WIDTH = 25;
    this.MAP_HEIGHT = 25;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around edges (except south to forest_path, north to mountain_path)
        if (x === 0 || x === this.MAP_WIDTH - 1) {
          row.push(this.TILE_WALL);
        } else if (y === 0) {
          // North edge - open path to mountain
          if (x === 12) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else if (y === this.MAP_HEIGHT - 1) {
          // South edge - open path back to forest_path
          if (x === 12) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Dense forest obstacles
    this.placeCliff(3, 3, 'large');
    this.placeCliff(8, 5, 'small');
    this.placeCliff(15, 4, 'large');
    this.placeCliff(20, 6, 'small');
    this.placeCliff(5, 10, 'small');
    this.placeCliff(11, 9, 'large');
    this.placeCliff(18, 11, 'small');
    this.placeCliff(4, 15, 'large');
    this.placeCliff(13, 16, 'small');
    this.placeCliff(19, 18, 'large');
    this.placeCliff(7, 20, 'small');

    // South exit back to Forest Path
    this.mapTransitions.push({
      x: 12,
      y: this.MAP_HEIGHT - 1,
      targetMap: 'forest_path',
      targetX: 15,
      targetY: 1
    });

    // North exit to Mountain Path
    this.mapTransitions.push({
      x: 12,
      y: 0,
      targetMap: 'mountain_path',
      targetX: 15,
      targetY: 18
    });
  }

  /**
   * Create mountain path map (rocky transition to mountain)
   */
  private createMountainPathMap(): void {
    this.MAP_WIDTH = 30;
    this.MAP_HEIGHT = 20;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around edges (except south to dark_forest, north to cave)
        if (x === 0 || x === this.MAP_WIDTH - 1) {
          row.push(this.TILE_WALL);
        } else if (y === 0) {
          // North edge - open path to cave
          if (x >= 14 && x <= 16) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else if (y === this.MAP_HEIGHT - 1) {
          // South edge - open path back to dark forest
          if (x === 15) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Rocky mountain terrain with many cliffs
    this.placeCliff(2, 2, 'large');
    this.placeCliff(7, 3, 'small');
    this.placeCliff(12, 2, 'large');
    this.placeCliff(20, 3, 'small');
    this.placeCliff(25, 2, 'large');
    this.placeCliff(4, 7, 'small');
    this.placeCliff(10, 8, 'large');
    this.placeCliff(17, 7, 'small');
    this.placeCliff(22, 8, 'large');
    this.placeCliff(3, 12, 'large');
    this.placeCliff(9, 13, 'small');
    this.placeCliff(15, 12, 'large');
    this.placeCliff(21, 14, 'small');
    this.placeCliff(26, 13, 'large');

    // South exit back to Dark Forest
    this.mapTransitions.push({
      x: 15,
      y: this.MAP_HEIGHT - 1,
      targetMap: 'dark_forest',
      targetX: 12,
      targetY: 1
    });

    // North exit to Mountain Cave
    this.mapTransitions.push({
      x: 15,
      y: 0,
      targetMap: 'mountain_cave',
      targetX: 12,
      targetY: 23
    });
  }

  /**
   * Create mountain cave map (dark cave interior)
   */
  private createMountainCaveMap(): void {
    this.MAP_WIDTH = 25;
    this.MAP_HEIGHT = 25;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around edges (except south to mountain_path, north to dragon's lair)
        if (x === 0 || x === this.MAP_WIDTH - 1) {
          row.push(this.TILE_WALL);
        } else if (y === 0) {
          // North edge - open path to dragon's lair
          if (x === 12) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else if (y === this.MAP_HEIGHT - 1) {
          // South edge - open path back to mountain path
          if (x === 12) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Cave obstacles - stalagmites and rock formations
    this.placeCliff(3, 4, 'large');
    this.placeCliff(9, 3, 'small');
    this.placeCliff(16, 5, 'large');
    this.placeCliff(21, 4, 'small');
    this.placeCliff(5, 9, 'small');
    this.placeCliff(12, 10, 'large');
    this.placeCliff(19, 9, 'small');
    this.placeCliff(3, 14, 'large');
    this.placeCliff(10, 15, 'small');
    this.placeCliff(17, 14, 'large');
    this.placeCliff(5, 19, 'small');
    this.placeCliff(14, 20, 'large');
    this.placeCliff(20, 19, 'small');

    // South exit back to Mountain Path
    this.mapTransitions.push({
      x: 12,
      y: this.MAP_HEIGHT - 1,
      targetMap: 'mountain_path',
      targetX: 15,
      targetY: 1
    });

    // North exit to Dragon's Lair Entrance
    this.mapTransitions.push({
      x: 12,
      y: 0,
      targetMap: 'dragon_lair_entrance',
      targetX: 15,
      targetY: 23
    });
  }

  /**
   * Create dragon's lair entrance map
   */
  private createDragonLairEntranceMap(): void {
    this.MAP_WIDTH = 30;
    this.MAP_HEIGHT = 25;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around edges (except south to cave, north to dragon arena)
        if (x === 0 || x === this.MAP_WIDTH - 1) {
          row.push(this.TILE_WALL);
        } else if (y === 0) {
          // North edge - open path to dragon arena (wide entrance)
          if (x >= 13 && x <= 17) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else if (y === this.MAP_HEIGHT - 1) {
          // South edge - open path back to mountain cave
          if (x === 15) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Large rocky formations leading to dragon's lair
    this.placeCliff(3, 5, 'large');
    this.placeCliff(10, 6, 'large');
    this.placeCliff(24, 5, 'large');
    this.placeCliff(5, 10, 'large');
    this.placeCliff(17, 11, 'large');
    this.placeCliff(25, 12, 'large');
    this.placeCliff(8, 16, 'large');
    this.placeCliff(20, 17, 'large');
    this.placeCliff(4, 20, 'large');
    this.placeCliff(13, 19, 'small');
    this.placeCliff(26, 21, 'large');

    // South exit back to Mountain Cave
    this.mapTransitions.push({
      x: 15,
      y: this.MAP_HEIGHT - 1,
      targetMap: 'mountain_cave',
      targetX: 12,
      targetY: 1
    });

    // North exit to Dragon Arena
    this.mapTransitions.push({
      x: 15,
      y: 0,
      targetMap: 'dragon_arena',
      targetX: 10,
      targetY: 18
    });
  }

  /**
   * Create dragon arena map (final boss)
   */
  private createDragonArenaMap(): void {
    this.MAP_WIDTH = 20;
    this.MAP_HEIGHT = 20;
    this.tilemap = [];
    this.cliffs = [];
    this.mapTransitions = [];

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        // Create walls around edges (except south exit)
        if (x === 0 || x === this.MAP_WIDTH - 1 || y === 0) {
          row.push(this.TILE_WALL);
        } else if (y === this.MAP_HEIGHT - 1) {
          // South edge - open path back to lair entrance
          if (x >= 9 && x <= 11) {
            row.push(this.TILE_GROUND);
          } else {
            row.push(this.TILE_WALL);
          }
        } else {
          row.push(this.TILE_GROUND);
        }
      }
      this.tilemap.push(row);
    }

    // Make sure spawn point is clear
    if (this.playerGridY >= 0 && this.playerGridY < this.MAP_HEIGHT &&
        this.playerGridX >= 0 && this.playerGridX < this.MAP_WIDTH) {
      this.tilemap[this.playerGridY][this.playerGridX] = this.TILE_GROUND;
    }

    // Minimal obstacles - large open arena for boss fight
    this.placeCliff(3, 5, 'small');
    this.placeCliff(15, 5, 'small');
    this.placeCliff(3, 13, 'small');
    this.placeCliff(15, 13, 'small');

    // South exit back to Dragon's Lair Entrance
    this.mapTransitions.push({
      x: 10,
      y: this.MAP_HEIGHT - 1,
      targetMap: 'dragon_lair_entrance',
      targetX: 15,
      targetY: 1
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
      // Place Shop/House (right side) at position (16, 4)
      const house = this.add.sprite(
        16 * this.TILE_SIZE,
        4 * this.TILE_SIZE,
        'house_wood'
      );
      house.setOrigin(0, 0);
      house.setDepth(5); // Above ground, below player
      house.setScale(0.5); // 96x128 at 0.5x = 48x64
      this.decorations.push({ sprite: house });

      // Place Blacksmith (middle right) at position (12, 4)
      const blacksmith = this.add.sprite(
        12 * this.TILE_SIZE,
        4 * this.TILE_SIZE,
        'house_wood'
      );
      blacksmith.setOrigin(0, 0);
      blacksmith.setDepth(5);
      blacksmith.setScale(0.5);
      blacksmith.setTint(0x888888); // Gray tint to differentiate
      this.decorations.push({ sprite: blacksmith });

      // Place Inn (left side) at position (3, 4)
      const inn = this.add.sprite(
        3 * this.TILE_SIZE,
        4 * this.TILE_SIZE,
        'house_wood'
      );
      inn.setOrigin(0, 0);
      inn.setDepth(5);
      inn.setScale(0.5);
      inn.setTint(0xaa8844); // Brown tint to differentiate
      this.decorations.push({ sprite: inn });

      // Place Elder's House (top center) at position (9, 2) - smaller 3x3
      const elderHouse = this.add.sprite(
        9 * this.TILE_SIZE,
        2 * this.TILE_SIZE,
        'house_wood'
      );
      elderHouse.setOrigin(0, 0);
      elderHouse.setDepth(5);
      elderHouse.setScale(0.375); // Smaller scale for 3x3 building
      elderHouse.setTint(0xffdd99); // Light yellow tint
      this.decorations.push({ sprite: elderHouse });

      // Place animals (adjusted positions to avoid new buildings)
      const animalPositions = [
        { key: 'cow', x: 7, y: 9 },
        { key: 'pig', x: 9, y: 11 },
        { key: 'chicken', x: 12, y: 11 },
        { key: 'sheep', x: 15, y: 11 }
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

        // Reset encounter counter to prevent immediate encounters on new map
        this.gameState.resetEncounterSteps();

        // Restart the scene to load new map
        this.scene.restart();
      });
    }
  }

  /**
   * Check om der skal være et random encounter
   */
  private checkForEncounter(): void {
    const currentMap = this.gameState.getState().currentMap;

    // Define which maps have encounters and their encounter table IDs
    const encounterMaps: Record<string, string> = {
      'village_outskirts': 'forest_north',  // Slimes and Wolves
      'forest_path': 'forest_north',        // Slimes and Wolves
      'dark_forest': 'forest_south',        // Wolves and Goblins
      'mountain_path': 'mountain',          // Bats and Stone Golems
      'mountain_cave': 'mountain',          // Bats and Stone Golems
      'dragon_lair_entrance': 'mountain'    // Bats and Stone Golems
      // 'dragon_arena' has no random encounters - boss only
    };

    // Only check for encounters on maps with encounter zones
    if (!encounterMaps[currentMap]) {
      return; // No encounters on this map (village, interiors, dragon_arena, etc.)
    }

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
      this.startEncounter(encounterMaps[currentMap]);
    }
  }

  /**
   * Start en random encounter
   */
  private startEncounter(encounterTableId?: string): void {
    console.log('Encounter triggered!');

    // Reset encounter counter
    this.gameState.resetEncounterSteps();

    // Get current map's encounter table if not specified
    if (!encounterTableId) {
      const currentMap = this.gameState.getState().currentMap;
      encounterTableId = currentMap === 'village_outskirts' ? 'forest_north' : 'forest_north';
    }

    // Generate enemies from encounter table (scaled to player level)
    const playerLevel = this.gameState.getPlayer().level;
    const enemies = generateEncounter(encounterTableId, playerLevel);

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

    // Create dragon (boss doesn't scale with player level)
    const dragon = createMonster('red_dragon', this.gameState.getPlayer().level);

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
        // Pause OverworldScene to prevent menu opening when ESC is pressed
        this.scene.pause();

        this.scene.launch('ShopScene', {
          shop,
          onComplete: () => {
            // Resume OverworldScene after shop closes
            this.scene.resume();
          }
        });
        return;
      }
    }

    // Show NPC dialog
    const dialog = getDialog(npc.dialog);
    if (!dialog) {
      console.error(`Dialog ${npc.dialog} not found!`);
      return;
    }

    // Pause OverworldScene to prevent player movement during dialog
    this.scene.pause();

    this.scene.launch('DialogScene', {
      dialog: dialog,
      onComplete: () => {
        // Set event flag if dialog has one
        if (dialog.setsFlag) {
          this.gameState.setEventFlag(dialog.setsFlag, true);
        }

        // Refresh NPCs (in case flags changed visibility)
        this.refreshNPCs();

        // Resume OverworldScene after dialog closes
        this.scene.resume();
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
