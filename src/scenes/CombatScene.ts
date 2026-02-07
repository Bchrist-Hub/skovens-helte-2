import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';
import { CombatSystem } from '@/systems/CombatSystem';
import { CharacterSystem } from '@/systems/CharacterSystem';
import { LootSystem } from '@/systems/LootSystem';
import { InventorySystem } from '@/systems/InventorySystem';
import { getItem } from '@/data/items';
import type { Monster } from '@/types';

/**
 * CombatScene - Turbaseret kampscene
 *
 * Delegerer al kamplogik til CombatSystem og visualiserer resultaterne.
 */
export class CombatScene extends Phaser.Scene {
  private inputService!: InputService;
  private gameState!: GameStateManager;
  private combatSystem!: CombatSystem;

  // Combat state
  private enemies: Monster[] = [];
  private currentPhase: 'player_turn' | 'enemy_turn' | 'animating' | 'victory' | 'defeat' = 'player_turn';
  private selectedAction: number = 0;
  private canInput: boolean = false;

  // UI elements
  private playerHPText!: Phaser.GameObjects.Text;
  private playerMPText!: Phaser.GameObjects.Text;
  private enemySprites: Phaser.GameObjects.Sprite[] = [];
  private enemyHPTexts: Phaser.GameObjects.Text[] = [];
  private messageText!: Phaser.GameObjects.Text;
  private actionMenu!: Phaser.GameObjects.Container;
  private actionTexts: Phaser.GameObjects.Text[] = [];

  // Actions
  private readonly actions = [
    { id: 'attack_normal', label: 'Angreb', description: '95% præcision' },
    { id: 'attack_heavy', label: 'Hårdt slag', description: '70% præcision, +50% skade' },
    { id: 'defend', label: 'Forsvar', description: 'Halvér næste skade' },
    { id: 'item_heal', label: 'Helbredelsesdrik', description: '+30 HP' },
    { id: 'spell_fire', label: 'Ild (5 MP)', description: 'Magisk skade' },
    { id: 'spell_heal', label: 'Helbred (4 MP)', description: 'Gendan HP' }
  ];

  constructor() {
    super({ key: 'CombatScene' });
  }

  /**
   * Initialize med fjender
   */
  init(data: { enemies: Monster[] }): void {
    this.enemies = data.enemies || [];

    // Nulstil arrays fra tidligere kampe
    this.enemySprites = [];
    this.enemyHPTexts = [];
    this.actionTexts = [];

    // Nulstil state
    this.currentPhase = 'player_turn';
    this.selectedAction = 0;
    this.canInput = false;
  }

  create(): void {
    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();

    // Opret CombatSystem
    const player = this.gameState.getPlayer();
    this.combatSystem = new CombatSystem(player, this.enemies);

    // Opret UI
    this.createCombatUI();
    this.createActionMenu();

    // Start kamp
    this.showMessage(`En ${this.enemies.map(e => e.name).join(' og ')} dukker op!`);

    // Fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Allow input efter kort delay
    this.time.delayedCall(1000, () => {
      this.canInput = true;
      this.currentPhase = 'player_turn';
    });
  }

  update(): void {
    if (!this.canInput || this.currentPhase === 'animating') return;

    this.inputService.update();

    if (this.currentPhase === 'player_turn') {
      this.handlePlayerInput();
    }
  }

  /**
   * Håndter spiller input
   */
  private handlePlayerInput(): void {
    // Navigate menu
    if (this.inputService.justPressed('down')) {
      this.selectedAction = (this.selectedAction + 1) % this.actions.length;
      this.updateActionMenu();
    }

    if (this.inputService.justPressed('up')) {
      this.selectedAction = (this.selectedAction - 1 + this.actions.length) % this.actions.length;
      this.updateActionMenu();
    }

    // Select action
    if (this.inputService.justPressed('action')) {
      this.executePlayerAction();
    }
  }

  /**
   * Udfør spillerens handling
   */
  private executePlayerAction(): void {
    this.canInput = false;
    this.currentPhase = 'animating';

    const action = this.actions[this.selectedAction];

    // Find første levende fjende
    const targetIndex = this.enemies.findIndex(e => e.currentHP > 0);

    if (targetIndex === -1) {
      // Ingen levende fjender - dette burde ikke ske
      console.error('No alive enemies found!');
      return;
    }

    const event = this.combatSystem.executePlayerAction(action.id as any, targetIndex);

    // Vis resultat
    this.showMessage(event.message);
    this.updateUI();

    // Animate damage
    if (event.damage > 0) {
      this.showDamageNumber(event.damage, false);
    }
    if (event.healing > 0) {
      this.showDamageNumber(event.healing, true);
    }

    // Check om kampen er slut
    if (event.combatEnded) {
      this.time.delayedCall(2000, () => {
        this.endCombat(event.combatResult!);
      });
      return;
    }

    // Fortsæt til fjende-tur
    this.time.delayedCall(1500, () => {
      this.executeEnemyTurns();
    });
  }

  /**
   * Udfør alle fjenders ture
   */
  private executeEnemyTurns(): void {
    const aliveEnemies = this.combatSystem.getAliveEnemies();

    if (aliveEnemies.length === 0) {
      // Ingen levende fjender - sejr
      this.endCombat('victory');
      return;
    }

    // Udfør én fjende ad gangen med delay
    let delay = 0;

    aliveEnemies.forEach((enemy, index) => {
      this.time.delayedCall(delay, () => {
        const enemyIndex = this.enemies.findIndex(e => e.id === enemy.id && e.currentHP > 0);
        const event = this.combatSystem.executeEnemyTurn(enemyIndex);

        this.showMessage(event.message);
        this.updateUI();

        if (event.damage > 0) {
          this.showDamageNumber(event.damage, false);
        }

        // Check om spilleren er død
        if (event.combatEnded) {
          this.time.delayedCall(2000, () => {
            this.endCombat('defeat');
          });
        } else if (index === aliveEnemies.length - 1) {
          // Sidste fjende - tilbage til spiller-tur
          this.time.delayedCall(1500, () => {
            this.currentPhase = 'player_turn';
            this.canInput = true;
            this.showMessage('Hvad vil du gøre?');
          });
        }
      });

      delay += 1500;
    });
  }

  /**
   * Afslut kamp
   */
  private endCombat(result: 'victory' | 'defeat'): void {
    this.currentPhase = result;
    this.canInput = false;

    if (result === 'victory') {
      this.handleVictory();
    } else {
      this.handleDefeat();
    }
  }

  /**
   * Håndter sejr - vis XP, level-up, loot
   */
  private handleVictory(): void {
    const player = this.gameState.getPlayer();
    const inventory = this.gameState.getInventory();

    // Beregn rewards
    const totalXP = LootSystem.calculateTotalXP(this.enemies);
    const loot = LootSystem.generateLoot(this.enemies);

    // Tilføj loot til inventory
    loot.forEach(drop => {
      InventorySystem.addItem(inventory, drop.itemId, drop.quantity);
    });

    // Tilføj XP og check for level-up
    const levelUpResult = CharacterSystem.addXP(player, totalXP);

    // Vis sejr-besked med item navne
    let message = `Sejr!\n+${totalXP} XP`;

    if (loot.length > 0) {
      const lootText = loot.map(drop => {
        const item = getItem(drop.itemId);
        return `${drop.quantity}x ${item?.name || drop.itemId}`;
      }).join(', ');
      message += `\nLoot: ${lootText}`;
    }

    this.showMessage(message);

    // Hvis level-up, vis det efter en delay
    if (levelUpResult.leveledUp) {
      this.time.delayedCall(2000, () => {
        this.showLevelUpMessage(levelUpResult);

        // Returnér til overworld efter level-up besked
        this.time.delayedCall(3000, () => {
          this.returnToOverworld();
        });
      });
    } else {
      // Ingen level-up, returner efter kort delay
      this.time.delayedCall(3000, () => {
        this.returnToOverworld();
      });
    }
  }

  /**
   * Vis level-up besked
   */
  private showLevelUpMessage(levelUpResult: any): void {
    const message = `LEVEL UP!\nLevel ${levelUpResult.newLevel}\n\n` +
      `HP +${levelUpResult.statGains.maxHP}\n` +
      `MP +${levelUpResult.statGains.maxMP}\n` +
      `ATK +${levelUpResult.statGains.atk}\n` +
      `DEF +${levelUpResult.statGains.def}`;

    this.showMessage(message);

    // Vis HP/MP bars opdateret
    this.updateUI();
  }

  /**
   * Håndter nederlag - vis game over
   */
  private handleDefeat(): void {
    this.showMessage('Du er blevet besejret...\n\nGame Over');

    this.time.delayedCall(3000, () => {
      // Reset player HP/MP til fuld (så de kan prøve igen)
      const player = this.gameState.getPlayer();
      player.currentHP = player.baseStats.maxHP;
      player.currentMP = player.baseStats.maxMP;

      this.returnToOverworld();
    });
  }

  /**
   * Returnér til overworld
   */
  private returnToOverworld(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('OverworldScene');
    });
  }

  // ============================================================================
  // UI CREATION
  // ============================================================================

  private createCombatUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x001020, 1);
    bg.fillRect(0, 0, width, height);

    // Player HP/MP bar (nederst til venstre)

    this.playerHPText = this.add.text(10, height - 40, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff'
    });

    this.playerMPText = this.add.text(10, height - 25, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#00ffff'
    });

    // Enemy sprites (øverst, centreret)
    this.enemies.forEach((_enemy, index) => {
      const x = width / 2 + (index - this.enemies.length / 2) * 60;
      const y = 60;

      // Placeholder sprite (farvet firkant)
      const sprite = this.add.sprite(x, y, 'tile_wall');
      sprite.setScale(2);
      sprite.setTint(0xff0000);
      this.enemySprites.push(sprite);

      // HP text
      const hpText = this.add.text(x, y + 30, '', {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#ffffff'
      });
      hpText.setOrigin(0.5);
      this.enemyHPTexts.push(hpText);
    });

    // Message text (midt)
    this.messageText = this.add.text(width / 2, height / 2, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 40 }
    });
    this.messageText.setOrigin(0.5);

    this.updateUI();
  }

  private createActionMenu(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const menuX = width - 120;
    const menuY = height - 100;

    this.actionMenu = this.add.container(menuX, menuY);

    // Menu background
    const bg = this.add.graphics();
    bg.fillStyle(0x101840, 0.9);
    bg.fillRect(0, 0, 110, 90);
    bg.lineStyle(2, 0xffffff, 1);
    bg.strokeRect(0, 0, 110, 90);
    this.actionMenu.add(bg);

    // Action texts (vis kun 4 ad gangen for plads)
    const visibleActions = this.actions.slice(0, 4);

    visibleActions.forEach((action, index) => {
      const text = this.add.text(5, 5 + index * 20, action.label, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#cccccc'
      });
      this.actionMenu.add(text);
      this.actionTexts.push(text);
    });

    // Tilføj "Mere..." hvis der er flere handlinger
    if (this.actions.length > 4) {
      const moreText = this.add.text(5, 85, '(Op/Ned for mere)', {
        fontFamily: 'Arial',
        fontSize: '9px',
        color: '#888888'
      });
      this.actionMenu.add(moreText);
    }

    this.updateActionMenu();
  }

  private updateActionMenu(): void {
    // Scroll menu hvis nødvendigt
    const startIndex = Math.max(0, Math.min(this.selectedAction - 1, this.actions.length - 4));

    this.actionTexts.forEach((text, index) => {
      const actionIndex = startIndex + index;
      const action = this.actions[actionIndex];

      if (action) {
        text.setText(action.label);

        if (actionIndex === this.selectedAction) {
          text.setColor('#ffffff');
          text.setFontStyle('bold');
        } else {
          text.setColor('#cccccc');
          text.setFontStyle('normal');
        }
      }
    });
  }

  private updateUI(): void {
    const player = this.gameState.getPlayer();

    // Update player stats
    this.playerHPText.setText(`HP: ${player.currentHP}/${player.baseStats.maxHP}`);
    this.playerMPText.setText(`MP: ${player.currentMP}/${player.baseStats.maxMP}`);

    // Update enemy HP
    this.enemies.forEach((enemy, index) => {
      const hpText = this.enemyHPTexts[index];
      if (hpText) {
        hpText.setText(`${enemy.name}\n${enemy.currentHP}/${enemy.stats.maxHP}`);

        // Fade out hvis død
        if (enemy.currentHP <= 0 && this.enemySprites[index]) {
          this.enemySprites[index].setAlpha(0.3);
          hpText.setAlpha(0.3);
        }
      }
    });
  }

  private showMessage(message: string): void {
    this.messageText.setText(message);

    // Fade in effekt
    this.messageText.setAlpha(0);
    this.tweens.add({
      targets: this.messageText,
      alpha: 1,
      duration: 200
    });
  }

  private showDamageNumber(amount: number, isHealing: boolean): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const text = this.add.text(width / 2, height / 2 - 20, amount.toString(), {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: isHealing ? '#00ff00' : '#ff0000',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);

    // Fly op og fade out
    this.tweens.add({
      targets: text,
      y: height / 2 - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    this.inputService.destroy();

    // Destroy UI elements
    if (this.actionMenu) {
      this.actionMenu.destroy();
    }

    // Nulstil arrays (sprites bliver automatisk destroyed af Phaser)
    this.enemySprites = [];
    this.enemyHPTexts = [];
    this.actionTexts = [];
  }
}
