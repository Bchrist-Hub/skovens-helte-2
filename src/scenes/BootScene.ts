import Phaser from 'phaser';

/**
 * BootScene - Indlæser alle assets og viser loading progress
 *
 * Dette er den første scene der køres. Den loader alle sprites, tilemaps,
 * lyde osv. og viser en loading bar til spilleren.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Setup loading bar
    this.createLoadingBar();

    // TODO: Load assets når vi har dem
    // For nu laver vi bare placeholder graphics

    // Eksempel: Load tilemap når vi har det
    // this.load.tilemapTiledJSON('village', 'assets/maps/village.json');

    // Eksempel: Load spritesheets
    // this.load.spritesheet('player', 'assets/sprites/player.png', {
    //   frameWidth: 16,
    //   frameHeight: 16
    // });

    console.log('BootScene: Assets loading...');
  }

  create(): void {
    console.log('BootScene: Assets loaded successfully');

    // Create placeholder graphics that we can use until we have real assets
    this.createPlaceholderGraphics();

    // Transition to TitleScene after a brief delay
    this.time.delayedCall(500, () => {
      this.scene.start('TitleScene');
    });
  }

  private createLoadingBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading text
    const loadingText = this.add.text(width / 2, height / 2 - 20, 'Indlæser...', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff'
    });
    loadingText.setOrigin(0.5);

    // Loading bar background
    const barWidth = 200;
    const barHeight = 20;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 10;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(barX, barY, barWidth, barHeight);

    // Update loading bar as assets load
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4);
    });

    // Clean up when loading is complete
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  /**
   * Create placeholder graphics til vi har rigtige sprites
   */
  private createPlaceholderGraphics(): void {
    // Player sprite (16x16 green square)
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x00ff00);
    playerGraphics.fillRect(0, 0, 16, 16);
    playerGraphics.generateTexture('player_placeholder', 16, 16);
    playerGraphics.destroy();

    // Ground tile (16x16 dark green)
    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x228b22);
    groundGraphics.fillRect(0, 0, 16, 16);
    groundGraphics.generateTexture('tile_ground', 16, 16);
    groundGraphics.destroy();

    // Wall tile (16x16 gray)
    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x808080);
    wallGraphics.fillRect(0, 0, 16, 16);
    wallGraphics.generateTexture('tile_wall', 16, 16);
    wallGraphics.destroy();

    console.log('Placeholder graphics created');
  }
}
