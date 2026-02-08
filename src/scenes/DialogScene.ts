import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';
import { getDialog } from '@/data/dialogs';
import type { DialogEntry, DialogChoice } from '@/types';

/**
 * DialogScene - Overlay scene til at vise dialog med typewriter-effekt
 *
 * VIGTIG: Dette er en overlay-scene. Den startes med scene.launch() og
 * stoppes med scene.stop() (IKKE pause/resume) for at undgå input-problemer.
 *
 * Supports dialog choices for interactive conversations.
 */
export class DialogScene extends Phaser.Scene {
  private inputService!: InputService;
  private gameState!: GameStateManager;

  // Dialog state
  private currentDialog: DialogEntry | null = null;
  private currentLineIndex: number = 0;
  private isTyping: boolean = false;
  private canAdvance: boolean = false;
  private showingChoices: boolean = false;
  private selectedChoiceIndex: number = 0;

  // UI elements
  private dialogBox!: Phaser.GameObjects.Graphics;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private continueIcon!: Phaser.GameObjects.Text;
  private choiceBoxGraphics?: Phaser.GameObjects.Graphics;
  private choiceTexts: Phaser.GameObjects.Text[] = [];

  // Typewriter
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private fullText: string = '';
  private visibleCharacters: number = 0;
  private readonly CHAR_DELAY = 30; // ms per character

  // Callback when dialog ends
  private onComplete?: () => void;

  constructor() {
    super({ key: 'DialogScene' });
  }

  /**
   * Initialize scene med dialog data
   */
  init(data: { dialog: DialogEntry; onComplete?: () => void }): void {
    this.currentDialog = data.dialog;
    this.onComplete = data.onComplete;
    this.currentLineIndex = 0;
    this.showingChoices = false;
    this.selectedChoiceIndex = 0;
  }

  create(): void {
    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();
    this.createDialogBox();

    // Start vise den første linje
    if (this.currentDialog) {
      this.showCurrentLine();
    }

    // Allow input after brief delay
    this.time.delayedCall(200, () => {
      this.canAdvance = true;
    });
  }

  update(): void {
    this.inputService.update();

    if (!this.canAdvance) return;

    // If showing choices, handle choice selection
    if (this.showingChoices) {
      this.handleChoiceInput();
      return;
    }

    // Skip typewriter or advance to next line
    if (this.inputService.justPressed('action') || this.inputService.justPressed('cancel')) {
      if (this.isTyping) {
        // Skip to end of current line
        this.skipTypewriter();
      } else {
        // Advance to next line or close dialog
        this.advanceDialog();
      }
    }
  }

  /**
   * Handle input when showing choices
   */
  private handleChoiceInput(): void {
    const choices = this.getAvailableChoices();
    if (!choices || choices.length === 0) return;

    // Navigate choices
    if (this.inputService.justPressed('up')) {
      this.selectedChoiceIndex = Math.max(0, this.selectedChoiceIndex - 1);
      this.updateChoiceDisplay();
    }

    if (this.inputService.justPressed('down')) {
      this.selectedChoiceIndex = Math.min(choices.length - 1, this.selectedChoiceIndex + 1);
      this.updateChoiceDisplay();
    }

    // Select choice
    if (this.inputService.justPressed('action')) {
      this.selectChoice(choices[this.selectedChoiceIndex]);
    }

    // Cancel (close dialog)
    if (this.inputService.justPressed('cancel')) {
      this.closeDialog();
    }
  }

  /**
   * Get available choices (filtered by conditions)
   */
  private getAvailableChoices(): DialogChoice[] | undefined {
    if (!this.currentDialog?.choices) return undefined;

    const eventFlags = this.gameState.getEventFlags();

    return this.currentDialog.choices.filter(choice => {
      if (!choice.condition) return true;

      // Check condition (simple flag check)
      if (choice.condition.startsWith('!')) {
        // Negated condition
        const flag = choice.condition.substring(1);
        return !eventFlags[flag];
      } else {
        // Positive condition
        return eventFlags[choice.condition];
      }
    });
  }

  /**
   * Select a dialog choice
   */
  private selectChoice(choice: DialogChoice): void {
    this.showingChoices = false;
    this.clearChoiceDisplay();

    // Handle choice action
    if (choice.action) {
      this.executeAction(choice.action, choice.cost);
    }

    // Show next dialog if specified
    if (choice.nextDialog) {
      const nextDialog = getDialog(choice.nextDialog);
      if (nextDialog) {
        this.currentDialog = nextDialog;
        this.currentLineIndex = 0;
        this.showCurrentLine();
        return;
      }
    }

    // Otherwise close dialog
    this.closeDialog();
  }

  /**
   * Execute a dialog action
   */
  private executeAction(action: string, cost?: number): void {
    const player = this.gameState.getPlayer();
    const gold = this.gameState.getGold();

    switch (action) {
      case 'rest':
        // Rest at inn - heal to full HP/MP
        if (cost && gold >= cost) {
          player.currentHP = player.baseStats.maxHP;
          player.currentMP = player.baseStats.maxMP;
          this.gameState.addGold(-cost);
          console.log(`Rested at inn. HP/MP restored. Paid ${cost}g.`);
        } else {
          // Not enough gold - show error dialog
          console.log(`Cannot afford rest. Need ${cost}g, have ${gold}g.`);
          const errorDialog: DialogEntry = {
            id: 'innkeeper_no_gold',
            speaker: 'Kromand',
            lines: ['Du har ikke nok guld! Kom tilbage når du har 50 guld.']
          };
          this.currentDialog = errorDialog;
          this.currentLineIndex = 0;
          this.showCurrentLine();
          return; // Don't proceed to nextDialog
        }
        break;

      case 'accept_quest':
        // Accept dragon quest
        this.gameState.setEventFlag('quest_dragon_active', true);
        console.log('Quest accepted: Defeat the Dragon');
        break;

      case 'decline_quest':
        // Decline quest (no action needed)
        console.log('Quest declined');
        break;

      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  /**
   * Create the dialog box UI
   */
  private createDialogBox(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dialog box dimensions
    const boxWidth = width - 20;
    const boxHeight = 80; // Increased from 60 to accommodate wrapped text
    const boxX = 10;
    const boxY = height - boxHeight - 10;

    // Create box background (classic JRPG style)
    this.dialogBox = this.add.graphics();
    this.dialogBox.fillStyle(0x101840, 0.95); // Dark blue
    this.dialogBox.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Border
    this.dialogBox.lineStyle(2, 0xffffff, 1);
    this.dialogBox.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Speaker name (top-left of box)
    this.speakerText = this.add.text(boxX + 8, boxY + 6, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffdd00',
      fontStyle: 'bold'
    });

    // Dialog text
    this.dialogText = this.add.text(boxX + 8, boxY + 24, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: boxWidth - 30 }
    });

    // Continue icon (blinks when ready to advance)
    this.continueIcon = this.add.text(boxX + boxWidth - 15, boxY + boxHeight - 15, '▼', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff'
    });
    this.continueIcon.setVisible(false);

    // Make icon blink
    this.tweens.add({
      targets: this.continueIcon,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Show the current line with typewriter effect
   */
  private showCurrentLine(): void {
    if (!this.currentDialog) return;

    const lines = this.currentDialog.lines;
    if (this.currentLineIndex >= lines.length) {
      // All lines shown, check for choices
      if (this.currentDialog.choices && this.currentDialog.choices.length > 0) {
        this.showChoices();
      } else {
        this.closeDialog();
      }
      return;
    }

    // Update speaker
    this.speakerText.setText(this.currentDialog.speaker);

    // Start typewriter for current line
    this.fullText = lines[this.currentLineIndex];
    this.visibleCharacters = 0;
    this.isTyping = true;
    this.continueIcon.setVisible(false);

    this.startTypewriter();
  }

  /**
   * Show dialog choices
   */
  private showChoices(): void {
    const choices = this.getAvailableChoices();
    if (!choices || choices.length === 0) {
      this.closeDialog();
      return;
    }

    this.showingChoices = true;
    this.selectedChoiceIndex = 0;
    this.continueIcon.setVisible(false);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create separate choice box above the dialog box
    const choiceBoxWidth = width - 20;
    const choiceBoxHeight = Math.min(60, choices.length * 16 + 16); // Dynamic height based on choice count
    const choiceBoxX = 10;
    const choiceBoxY = height - 90 - choiceBoxHeight - 10; // Above the main dialog box (updated for taller dialog box)

    // Draw choice box background
    this.choiceBoxGraphics = this.add.graphics();
    this.choiceBoxGraphics.fillStyle(0x1a1a40, 0.95); // Slightly lighter than dialog box
    this.choiceBoxGraphics.fillRect(choiceBoxX, choiceBoxY, choiceBoxWidth, choiceBoxHeight);
    this.choiceBoxGraphics.lineStyle(2, 0xffff00, 1); // Yellow border to highlight choices
    this.choiceBoxGraphics.strokeRect(choiceBoxX, choiceBoxY, choiceBoxWidth, choiceBoxHeight);

    // Create choice text items
    let y = choiceBoxY + 8;

    choices.forEach((choice) => {
      let choiceText = choice.text;

      // Add cost if present
      if (choice.cost) {
        choiceText += ` (${choice.cost}g)`;
      }

      const text = this.add.text(choiceBoxX + 16, y, choiceText, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#ffffff'
      });

      this.choiceTexts.push(text);
      y += 14;
    });

    this.updateChoiceDisplay();
  }

  /**
   * Update choice display (highlight selected)
   */
  private updateChoiceDisplay(): void {
    this.choiceTexts.forEach((text, index) => {
      if (index === this.selectedChoiceIndex) {
        text.setColor('#ffff00');
        text.setFontStyle('bold');
        text.setText('► ' + text.text.replace('► ', ''));
      } else {
        text.setColor('#ffffff');
        text.setFontStyle('normal');
        text.setText(text.text.replace('► ', ''));
      }
    });
  }

  /**
   * Clear choice display
   */
  private clearChoiceDisplay(): void {
    // Destroy choice box graphics
    if (this.choiceBoxGraphics) {
      this.choiceBoxGraphics.destroy();
      this.choiceBoxGraphics = undefined;
    }

    // Destroy choice text objects
    this.choiceTexts.forEach(text => text.destroy());
    this.choiceTexts = [];
  }

  /**
   * Start typewriter effect
   */
  private startTypewriter(): void {
    // Clear previous timer
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }

    this.typewriterTimer = this.time.addEvent({
      delay: this.CHAR_DELAY,
      callback: () => {
        this.visibleCharacters++;
        this.dialogText.setText(this.fullText.substring(0, this.visibleCharacters));

        if (this.visibleCharacters >= this.fullText.length) {
          this.finishTypewriter();
        }
      },
      loop: true
    });
  }

  /**
   * Skip typewriter and show full text immediately
   */
  private skipTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    this.dialogText.setText(this.fullText);
    this.finishTypewriter();
  }

  /**
   * Typewriter finished for current line
   */
  private finishTypewriter(): void {
    this.isTyping = false;
    this.continueIcon.setVisible(true);
  }

  /**
   * Advance to next line or close dialog
   */
  private advanceDialog(): void {
    this.currentLineIndex++;

    if (this.currentDialog && this.currentLineIndex < this.currentDialog.lines.length) {
      // Show next line
      this.showCurrentLine();
    } else {
      // Check for choices or close
      if (this.currentDialog?.choices && this.currentDialog.choices.length > 0) {
        this.showChoices();
      } else {
        this.closeDialog();
      }
    }
  }

  /**
   * Close dialog and return to previous scene
   */
  private closeDialog(): void {
    this.canAdvance = false;

    // Clear choices if showing
    this.clearChoiceDisplay();

    // Fade out
    this.cameras.main.fadeOut(200, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Call completion callback
      if (this.onComplete) {
        this.onComplete();
      }

      // VIGTIG: Brug scene.stop() i stedet for bare at skjule
      // Dette forhindrer input-problemer
      this.scene.stop();
    });
  }

  /**
   * Cleanup når scene stoppes
   */
  shutdown(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    this.clearChoiceDisplay();
    this.inputService.destroy();
    this.currentDialog = null;
    this.onComplete = undefined;
  }
}
