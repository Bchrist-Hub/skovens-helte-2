import Phaser from 'phaser';
import type { InputState, Direction } from '@/types';

/**
 * Centraliseret input-håndtering.
 *
 * VIGTIG: Denne service oprettes ÉN gang og genbruges på tværs af alle scenes.
 * Den forhindrer at enkelte scenes "låser" tasterne ved at håndtere input ét sted.
 *
 * Scenes skal IKKE oprette deres egne key-bindings med scene.input.keyboard.addKey().
 * I stedet skal de læse fra denne service.
 */
export class InputService {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private cancelKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;

  // Current frame input state
  private currentState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
    cancel: false,
    menu: false
  };

  // Previous frame state (for detecting "just pressed")
  private previousState: InputState = { ...this.currentState };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeys();
  }

  private setupKeys(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      console.error('InputService: Keyboard not available');
      return;
    }

    // Create cursor keys
    this.cursors = keyboard.createCursorKeys();

    // Create action keys
    this.actionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.cancelKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.menuKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    // Also support SPACE as action
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => {
      this.currentState.action = true;
    });

    // Support WASD as alternative movement
    const wKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const aKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const sKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const dKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    wKey.on('down', () => this.currentState.up = true);
    aKey.on('down', () => this.currentState.left = true);
    sKey.on('down', () => this.currentState.down = true);
    dKey.on('down', () => this.currentState.right = true);
  }

  /**
   * Opdater input state. Skal kaldes i scene.update()
   */
  update(): void {
    // Gem forrige state
    this.previousState = { ...this.currentState };

    // Læs ny state
    this.currentState = {
      up: this.cursors.up.isDown,
      down: this.cursors.down.isDown,
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      action: this.actionKey.isDown,
      cancel: this.cancelKey.isDown,
      menu: this.menuKey.isDown
    };
  }

  /**
   * Er en tast trykket ned lige nu?
   */
  isDown(key: keyof InputState): boolean {
    return this.currentState[key];
  }

  /**
   * Blev en tast lige trykket (transition fra up til down)?
   * Dette er det du normalt vil bruge for at undgå repeat-triggers.
   */
  justPressed(key: keyof InputState): boolean {
    return this.currentState[key] && !this.previousState[key];
  }

  /**
   * Blev en tast lige sluppet?
   */
  justReleased(key: keyof InputState): boolean {
    return !this.currentState[key] && this.previousState[key];
  }

  /**
   * Returnerer den primære retning spilleren trykker (kun én ad gangen)
   * Prioriterer den nyeste tryk hvis flere tastes samtidigt.
   */
  getDirection(): Direction | null {
    // Prioriter den seneste tryk
    if (this.justPressed('up')) return 'up';
    if (this.justPressed('down')) return 'down';
    if (this.justPressed('left')) return 'left';
    if (this.justPressed('right')) return 'right';

    // Hvis ingen ny tryk, brug hvad der holdes nede
    if (this.currentState.up) return 'up';
    if (this.currentState.down) return 'down';
    if (this.currentState.left) return 'left';
    if (this.currentState.right) return 'right';

    return null;
  }

  /**
   * Nulstil state - brug dette når en scene pause/genoptager
   */
  reset(): void {
    this.currentState = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
      cancel: false,
      menu: false
    };
    this.previousState = { ...this.currentState };
  }

  /**
   * VIGTIG: Kald dette i shutdown() for at rydde op.
   * Vi nulstiller kun referencerne - vi dræber IKKE tasterne med removeKey!
   */
  destroy(): void {
    this.reset();
    // Vi fjerner IKKE keys fra Phaser - de forbliver i motoren
    // Vi nulstiller bare vores referencer
  }
}
