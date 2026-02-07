import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { TitleScene } from '@/scenes/TitleScene';
import { OverworldScene } from '@/scenes/OverworldScene';
import { DialogScene } from '@/scenes/DialogScene';
import { CombatScene } from '@/scenes/CombatScene';
import { MenuScene } from '@/scenes/MenuScene';
import { ShopScene } from '@/scenes/ShopScene';

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',

  // SNES-style resolution: 256x224 pixels
  width: 256,
  height: 224,

  // Pixel-perfect scaling
  pixelArt: true,
  antialias: false,
  roundPixels: true,

  // Scale configuration
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Scale up 3x or 4x depending on screen size
    min: {
      width: 256,
      height: 224
    },
    max: {
      width: 256 * 4,
      height: 224 * 4
    }
  },

  // Background color (black)
  backgroundColor: '#000000',

  // Scenes
  scene: [
    BootScene,
    TitleScene,
    OverworldScene,
    DialogScene,
    CombatScene,
    MenuScene,
    ShopScene
  ],

  // Physics (we're using grid-based movement, so we don't need Arcade physics)
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};

// Create game instance
new Phaser.Game(config);

console.log('Skovens Helte - Game initialized');
