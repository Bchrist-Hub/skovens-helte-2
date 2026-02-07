import Phaser from 'phaser';
import {
  PLAYER_SPRITES,
  MONSTER_SPRITES,
  TILE_SPRITES,
  DECORATION_SPRITES,
  PLAYER_ANIMS,
  MONSTER_ANIMS
} from '@/config/assets';

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

    console.log('BootScene: Loading assets...');

    // Load player sprites
    PLAYER_SPRITES.forEach(sprite => {
      this.load.spritesheet(sprite.key, sprite.path, {
        frameWidth: sprite.frameWidth!,
        frameHeight: sprite.frameHeight!
      });
    });

    // Load monster sprites
    MONSTER_SPRITES.forEach(sprite => {
      this.load.spritesheet(sprite.key, sprite.path, {
        frameWidth: sprite.frameWidth!,
        frameHeight: sprite.frameHeight!
      });
    });

    // Load tile images
    TILE_SPRITES.forEach(tile => {
      this.load.image(tile.key, tile.path);
    });

    // Load decoration images
    DECORATION_SPRITES.forEach(deco => {
      this.load.image(deco.key, deco.path);
    });

    console.log('BootScene: All assets queued for loading');
  }

  create(): void {
    console.log('BootScene: Assets loaded successfully');

    // Create animations
    this.createAnimations();

    // Create placeholder graphics as fallback
    this.createPlaceholderGraphics();

    // Transition to TitleScene after a brief delay
    this.time.delayedCall(500, () => {
      this.scene.start('TitleScene');
    });
  }

  /**
   * Create all sprite animations
   */
  private createAnimations(): void {
    // Create player animations
    PLAYER_ANIMS.forEach(anim => {
      if (!this.anims.exists(anim.key)) {
        this.anims.create({
          key: anim.key,
          frames: this.anims.generateFrameNumbers(anim.spriteKey, {
            frames: anim.frames
          }),
          frameRate: anim.frameRate,
          repeat: anim.repeat
        });
      }
    });

    // Create monster animations
    MONSTER_ANIMS.forEach(anim => {
      if (!this.anims.exists(anim.key)) {
        this.anims.create({
          key: anim.key,
          frames: this.anims.generateFrameNumbers(anim.spriteKey, {
            frames: anim.frames
          }),
          frameRate: anim.frameRate,
          repeat: anim.repeat
        });
      }
    });

    console.log('BootScene: Animations created');
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
