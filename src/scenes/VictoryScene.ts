import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';

/**
 * VictoryScene - Vises når spilleren besejrer dragen
 *
 * Viser:
 * - Victory besked
 * - Spiller stats (level, play time, battles won, gold)
 * - "Tilbage til Titel" knap
 */
export class VictoryScene extends Phaser.Scene {
  private inputService!: InputService;
  private gameState!: GameStateManager;
  private canInput: boolean = false;

  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(): void {
    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.fillRect(0, 0, width, height);

    // Victory title
    const title = this.add.text(width / 2, 25, 'SEJR!', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffff00',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Victory message
    const message = this.add.text(width / 2, 50, 'Du besejrede dragen!', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff'
    });
    message.setOrigin(0.5);

    // Get stats
    const player = this.gameState.getPlayer();
    const gold = this.gameState.getGold();
    const playTime = this.gameState.getState().playTime;
    const battlesWon = this.gameState.getBattlesWon();

    // Format play time
    const minutes = Math.floor(playTime / 60);
    const seconds = Math.floor(playTime % 60);
    const timeString = `${minutes}m ${seconds}s`;

    // Stats display - meget kompakt
    const statsY = 75;
    const statsLines = [
      '=== DINE STATS ===',
      `${player.name} - Level ${player.level}`,
      `HP: ${player.currentHP}/${player.baseStats.maxHP}`,
      `Guld: ${gold}g`,
      `Kampe vundet: ${battlesWon}`,
      `Spilletid: ${timeString}`,
      '',
      'Tak for at spille!',
      '',
      '[ENTER] Tilbage til titel'
    ];

    const statsText = this.add.text(width / 2, statsY, statsLines.join('\n'), {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 2
    });
    statsText.setOrigin(0.5, 0);

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Allow input after delay
    this.time.delayedCall(1500, () => {
      this.canInput = true;
    });
  }

  update(): void {
    if (!this.canInput) return;

    this.inputService.update();

    // Return to title
    if (this.inputService.justPressed('action')) {
      this.returnToTitle();
    }
  }

  private returnToTitle(): void {
    this.canInput = false;

    // Fade out
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('TitleScene');
    });
  }

  shutdown(): void {
    this.inputService.destroy();
  }
}
