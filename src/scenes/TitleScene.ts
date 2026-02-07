import Phaser from 'phaser';
import { GameStateManager } from '@/systems/GameState';
import { InputService } from '@/services/InputService';

/**
 * TitleScene - Hovedmenu med "Nyt Spil" og "Fortsæt"
 */
export class TitleScene extends Phaser.Scene {
  private inputService!: InputService;
  private gameState!: GameStateManager;
  private selectedOption: number = 0;
  private menuOptions: Phaser.GameObjects.Text[] = [];
  private canInput: boolean = false;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();

    // Reset state when scene restarts
    this.menuOptions = [];
    this.selectedOption = 0;
    this.canInput = false;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    const title = this.add.text(width / 2, height / 3, 'SKOVENS HELTE', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Menu options
    const startY = height / 2 + 20;
    const spacing = 30;

    // Show "Continue" first if save data exists
    const hasSave = this.gameState.hasSaveData();
    let currentY = startY;

    if (hasSave) {
      const continueText = this.add.text(width / 2, currentY, 'Fortsæt', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#cccccc'
      });
      continueText.setOrigin(0.5);
      this.menuOptions.push(continueText);
      currentY += spacing;
    }

    const newGameText = this.add.text(width / 2, currentY, 'Nyt Spil', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cccccc'
    });
    newGameText.setOrigin(0.5);
    this.menuOptions.push(newGameText);

    // Initial selection
    this.updateSelection();

    // Allow input after a short delay to prevent accidental triggers
    this.time.delayedCall(300, () => {
      this.canInput = true;
    });
  }

  update(): void {
    if (!this.canInput) return;

    this.inputService.update();

    // Navigate menu
    if (this.inputService.justPressed('down')) {
      this.selectedOption = (this.selectedOption + 1) % this.menuOptions.length;
      this.updateSelection();
    }

    if (this.inputService.justPressed('up')) {
      this.selectedOption = (this.selectedOption - 1 + this.menuOptions.length) % this.menuOptions.length;
      this.updateSelection();
    }

    // Select option
    if (this.inputService.justPressed('action')) {
      this.selectOption();
    }
  }

  private updateSelection(): void {
    // Update text colors
    this.menuOptions.forEach((text, index) => {
      if (index === this.selectedOption) {
        text.setColor('#ffffff');
        text.setFontStyle('bold');
      } else {
        text.setColor('#cccccc');
        text.setFontStyle('normal');
      }
    });
  }

  private selectOption(): void {
    this.canInput = false;

    const hasSave = this.gameState.hasSaveData();

    // If save exists: 0 = Continue, 1 = New Game
    // If no save: 0 = New Game
    if (hasSave && this.selectedOption === 0) {
      // Continue
      this.gameState.load();
      this.startGame();
    } else {
      // New Game
      this.gameState.newGame();
      this.startGame();
    }
  }

  private startGame(): void {
    // Fade out and start overworld
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('OverworldScene');
    });
  }

  shutdown(): void {
    this.inputService.destroy();
  }
}
