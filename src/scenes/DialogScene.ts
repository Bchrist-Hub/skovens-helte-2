import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import type { DialogEntry } from '@/types';

/**
 * DialogScene - Overlay scene til at vise dialog med typewriter-effekt
 *
 * VIGTIG: Dette er en overlay-scene. Den startes med scene.launch() og
 * stoppes med scene.stop() (IKKE pause/resume) for at undgå input-problemer.
 */
export class DialogScene extends Phaser.Scene {
  private inputService!: InputService;

  // Dialog state
  private currentDialog: DialogEntry | null = null;
  private currentLineIndex: number = 0;
  private isTyping: boolean = false;
  private canAdvance: boolean = false;

  // UI elements
  private dialogBox!: Phaser.GameObjects.Graphics;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private continueIcon!: Phaser.GameObjects.Text;

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
  }

  create(): void {
    this.inputService = new InputService(this);
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
   * Create the dialog box UI
   */
  private createDialogBox(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dialog box dimensions
    const boxWidth = width - 20;
    const boxHeight = 60;
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
      this.closeDialog();
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
      // Dialog finished
      this.closeDialog();
    }
  }

  /**
   * Close dialog and return to previous scene
   */
  private closeDialog(): void {
    this.canAdvance = false;

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
    this.inputService.destroy();
    this.currentDialog = null;
    this.onComplete = undefined;
  }
}
