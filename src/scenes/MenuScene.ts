import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';
import { InventorySystem } from '@/systems/InventorySystem';

/**
 * MenuScene - Overlay menu med stats, inventory og equipment
 *
 * Åbnes med ESC eller M tast fra OverworldScene
 */
export class MenuScene extends Phaser.Scene {
  private inputService!: InputService;
  private gameState!: GameStateManager;

  // Menu state
  private currentTab: 'stats' | 'inventory' | 'equipment' | 'system' = 'stats';
  private selectedItemIndex: number = 0;
  private scrollOffset: number = 0; // For paginating long lists
  private canInput: boolean = false;

  // Callback when menu closes
  private onComplete?: () => void;

  // UI elements
  private tabTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private contentContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data?: { onComplete?: () => void }): void {
    this.onComplete = data?.onComplete;
  }

  create(): void {
    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();

    // Create menu UI
    this.createMenuBackground();
    this.createTabs();
    this.contentContainer = this.add.container(0, 0);

    // Show initial tab
    this.updateTabContent();

    // Fade in
    this.cameras.main.fadeIn(200, 0, 0, 0);

    // Allow input after brief delay
    this.time.delayedCall(300, () => {
      this.canInput = true;
    });
  }

  update(): void {
    if (!this.canInput) return;

    this.inputService.update();

    // Close menu
    if (this.inputService.justPressed('cancel') || this.inputService.justPressed('menu')) {
      this.closeMenu();
      return;
    }

    // Switch tabs
    if (this.inputService.justPressed('left')) {
      this.switchTab(-1);
    }
    if (this.inputService.justPressed('right')) {
      this.switchTab(1);
    }

    // Navigate items (hvis i inventory/equipment/system tab)
    if (this.currentTab === 'inventory' || this.currentTab === 'equipment' || this.currentTab === 'system') {
      if (this.inputService.justPressed('up')) {
        this.selectedItemIndex = Math.max(0, this.selectedItemIndex - 1);
        this.updateTabContent();
      }
      if (this.inputService.justPressed('down')) {
        this.selectedItemIndex++;
        this.updateTabContent();
      }

      // Use/equip item or execute system option
      if (this.inputService.justPressed('action')) {
        if (this.currentTab === 'system') {
          this.executeSystemOption();
        } else {
          this.useSelectedItem();
        }
      }
    }
  }

  private createMenuBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    // Menu box
    const boxWidth = width - 20;
    const boxHeight = height - 20;
    const boxX = 10;
    const boxY = 10;

    const menuBox = this.add.graphics();
    menuBox.fillStyle(0x101840, 0.95);
    menuBox.fillRect(boxX, boxY, boxWidth, boxHeight);
    menuBox.lineStyle(2, 0xffffff, 1);
    menuBox.strokeRect(boxX, boxY, boxWidth, boxHeight);
  }

  private createTabs(): void {
    const tabs = ['Stats', 'Inv', 'Equip', 'System'];
    const startX = 20;
    const y = 20;
    const spacing = 55; // Reduced from 70 to prevent overflow

    tabs.forEach((tabName, index) => {
      const text = this.add.text(startX + index * spacing, y, tabName, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888'
      });

      const tabIds: Array<'stats' | 'inventory' | 'equipment' | 'system'> = ['stats', 'inventory', 'equipment', 'system'];
      this.tabTexts.set(tabIds[index], text);
    });

    this.updateTabHighlight();
  }

  private updateTabHighlight(): void {
    this.tabTexts.forEach((text, tabId) => {
      if (tabId === this.currentTab) {
        text.setColor('#ffffff');
        text.setFontStyle('bold');
      } else {
        text.setColor('#888888');
        text.setFontStyle('normal');
      }
    });
  }

  private switchTab(direction: number): void {
    const tabs: Array<'stats' | 'inventory' | 'equipment' | 'system'> = ['stats', 'inventory', 'equipment', 'system'];
    const currentIndex = tabs.indexOf(this.currentTab);
    const newIndex = (currentIndex + direction + tabs.length) % tabs.length;

    this.currentTab = tabs[newIndex];
    this.selectedItemIndex = 0;
    this.scrollOffset = 0; // Reset scroll when switching tabs

    this.updateTabHighlight();
    this.updateTabContent();
  }

  private updateTabContent(): void {
    // Clear previous content
    this.contentContainer.removeAll(true);

    switch (this.currentTab) {
      case 'stats':
        this.showStatsContent();
        break;
      case 'inventory':
        this.showInventoryContent();
        break;
      case 'equipment':
        this.showEquipmentContent();
        break;
      case 'system':
        this.showSystemContent();
        break;
    }
  }

  private showStatsContent(): void {
    const player = this.gameState.getPlayer();
    const totalAtk = InventorySystem.getTotalAtk(player);
    const totalDef = InventorySystem.getTotalDef(player);
    const gold = this.gameState.getGold();

    const lines = [
      `Navn: ${player.name}`,
      `Level: ${player.level}`,
      `XP: ${player.xp} / ${player.xpToNext}`,
      `HP: ${player.currentHP} / ${player.baseStats.maxHP}`,
      `MP: ${player.currentMP} / ${player.baseStats.maxMP}`,
      ``,
      `ATK: ${player.baseStats.atk} + ${totalAtk - player.baseStats.atk} = ${totalAtk}`,
      `DEF: ${player.baseStats.def} + ${totalDef - player.baseStats.def} = ${totalDef}`,
      ``,
      `Guld: ${gold}g`
    ];

    const text = this.add.text(20, 50, lines.join('\n'), {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      lineSpacing: 2
    });

    this.contentContainer.add(text);
  }

  private showInventoryContent(): void {
    const inventory = this.gameState.getInventory();

    // Show instructions at the top
    const instructions = this.add.text(20, 40, 'Enter: Brug | X: Sælg (halv pris)', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#888888'
    });
    this.contentContainer.add(instructions);

    if (inventory.items.length === 0) {
      const text = this.add.text(20, 60, 'Inventory er tomt', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      });
      this.contentContainer.add(text);
      return;
    }

    const maxVisibleItems = 5; // Maximum items shown at once
    const itemHeight = 32;
    let y = 60; // Start below instructions

    // Limit max index
    this.selectedItemIndex = Math.min(this.selectedItemIndex, inventory.items.length - 1);

    // Auto-scroll: ensure selected item is visible
    if (this.selectedItemIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedItemIndex;
    } else if (this.selectedItemIndex >= this.scrollOffset + maxVisibleItems) {
      this.scrollOffset = this.selectedItemIndex - maxVisibleItems + 1;
    }

    // Render only visible items
    const visibleItems = inventory.items.slice(this.scrollOffset, this.scrollOffset + maxVisibleItems);

    visibleItems.forEach((entry, visibleIndex) => {
      const actualIndex = this.scrollOffset + visibleIndex;
      const isSelected = actualIndex === this.selectedItemIndex;
      const color = isSelected ? '#ffff00' : '#ffffff';

      const text = this.add.text(20, y, `${entry.item.name} x${entry.quantity}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: color,
        fontStyle: isSelected ? 'bold' : 'normal'
      });

      const desc = this.add.text(30, y + 14, entry.item.description, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888',
        wordWrap: { width: 200 } // Prevent text overflow
      });

      this.contentContainer.add([text, desc]);

      // Show stats for equipment (weapons, armor, shields)
      if (entry.item.stats) {
        const statsText = [];
        if (entry.item.stats.atk) statsText.push(`ATK +${entry.item.stats.atk}`);
        if (entry.item.stats.def) statsText.push(`DEF +${entry.item.stats.def}`);

        if (statsText.length > 0) {
          const stats = this.add.text(30, y + 24, `[${statsText.join(' | ')}]`, {
            fontFamily: 'Arial',
            fontSize: '9px',
            color: '#00dd00'
          });
          this.contentContainer.add(stats);
        }
      }

      y += itemHeight;
    });

    // Show scroll indicators
    if (this.scrollOffset > 0) {
      const upArrow = this.add.text(220, 60, '▲ Mere', {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888'
      });
      this.contentContainer.add(upArrow);
    }

    if (this.scrollOffset + maxVisibleItems < inventory.items.length) {
      const downArrow = this.add.text(220, 60 + (maxVisibleItems - 1) * itemHeight + 16, '▼ Mere', {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888'
      });
      this.contentContainer.add(downArrow);
    }
  }

  private showEquipmentContent(): void {
    const player = this.gameState.getPlayer();

    let y = 50;

    // Header
    const header = this.add.text(20, y, 'UDRUSTET:', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888'
    });
    this.contentContainer.add(header);
    y += 20;

    // Weapon slot
    const weaponColor = this.selectedItemIndex === 0 ? '#ffff00' : '#ffffff';
    const weaponText = this.add.text(20, y, `Våben: ${player.equipment.weapon?.name || 'Intet'}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: weaponColor,
      fontStyle: this.selectedItemIndex === 0 ? 'bold' : 'normal'
    });
    this.contentContainer.add(weaponText);

    if (player.equipment.weapon) {
      const weaponStats = this.add.text(30, y + 14, `ATK +${player.equipment.weapon.stats?.atk || 0} (Tryk Enter for at unequippe)`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888'
      });
      this.contentContainer.add(weaponStats);
      y += 32;
    } else {
      y += 20;
    }

    // Armor slot
    const armorColor = this.selectedItemIndex === 1 ? '#ffff00' : '#ffffff';
    const armorText = this.add.text(20, y, `Rustning: ${player.equipment.armor?.name || 'Intet'}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: armorColor,
      fontStyle: this.selectedItemIndex === 1 ? 'bold' : 'normal'
    });
    this.contentContainer.add(armorText);

    if (player.equipment.armor) {
      const armorStats = this.add.text(30, y + 14, `DEF +${player.equipment.armor.stats?.def || 0} (Tryk Enter for at unequippe)`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888'
      });
      this.contentContainer.add(armorStats);
      y += 32;
    } else {
      y += 20;
    }

    // Shield slot
    const shieldColor = this.selectedItemIndex === 2 ? '#ffff00' : '#ffffff';
    const shieldText = this.add.text(20, y, `Skjold: ${player.equipment.shield?.name || 'Intet'}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: shieldColor,
      fontStyle: this.selectedItemIndex === 2 ? 'bold' : 'normal'
    });
    this.contentContainer.add(shieldText);

    if (player.equipment.shield) {
      const shieldStats = this.add.text(30, y + 14, `DEF +${player.equipment.shield.stats?.def || 0} (Tryk Enter for at unequippe)`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888'
      });
      this.contentContainer.add(shieldStats);
    }

    // Limit max index to 2 (weapon, armor, or shield)
    this.selectedItemIndex = Math.min(this.selectedItemIndex, 2);
  }

  private showSystemContent(): void {
    const systemOptions = [
      { label: 'Gem Spil', action: 'save' },
      { label: 'Tilbage til Titel', action: 'title' },
      { label: 'Luk Menu', action: 'close' }
    ];

    let y = 50;

    systemOptions.forEach((option, index) => {
      const isSelected = index === this.selectedItemIndex;
      const color = isSelected ? '#ffff00' : '#ffffff';

      const text = this.add.text(20, y, option.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: color,
        fontStyle: isSelected ? 'bold' : 'normal'
      });

      this.contentContainer.add(text);
      y += 30;
    });

    // Limit max index
    this.selectedItemIndex = Math.min(this.selectedItemIndex, systemOptions.length - 1);
  }

  private executeSystemOption(): void {
    const systemOptions = ['save', 'title', 'close'];
    const selectedOption = systemOptions[this.selectedItemIndex];

    switch (selectedOption) {
      case 'save':
        this.gameState.save();
        // Show feedback
        const savedText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 30, 'Spillet er gemt!', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#00ff00',
          fontStyle: 'bold'
        });
        savedText.setOrigin(0.5);

        // Fade out after 1 second
        this.time.delayedCall(1000, () => {
          savedText.destroy();
        });
        break;

      case 'title':
        this.canInput = false;

        // Get OverworldScene reference BEFORE stopping anything
        const overworldScene = this.scene.get('OverworldScene') as Phaser.Scene;

        if (overworldScene && overworldScene.cameras) {
          // Set up fade and callback
          overworldScene.cameras.main.fadeOut(500, 0, 0, 0);
          overworldScene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Stop OverworldScene
            this.scene.stop('OverworldScene');
            // Start TitleScene
            this.scene.start('TitleScene');
          });

          // Stop MenuScene immediately (don't wait for fade)
          this.scene.stop('MenuScene');
        } else {
          // Fallback - just transition directly
          this.scene.stop('MenuScene');
          this.scene.stop('OverworldScene');
          this.scene.start('TitleScene');
        }
        break;

      case 'close':
        this.closeMenu();
        break;
    }
  }

  private useSelectedItem(): void {
    const inventory = this.gameState.getInventory();
    const player = this.gameState.getPlayer();

    if (this.currentTab === 'inventory') {
      const selectedEntry = inventory.items[this.selectedItemIndex];

      if (!selectedEntry) return;

      const item = selectedEntry.item;

      // Hvis consumable, brug det
      if (item.type === 'consumable') {
        InventorySystem.useConsumable(inventory, player, item.id);
        this.updateTabContent();
      }
      // Hvis våben, rustning, eller skjold, equip det
      else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'shield') {
        InventorySystem.equipItem(inventory, player, item.id);
        this.updateTabContent();
      }
    }
    else if (this.currentTab === 'equipment') {
      // Unequip selected item (0 = weapon, 1 = armor, 2 = shield)
      if (this.selectedItemIndex === 0) {
        // Unequip weapon
        if (player.equipment.weapon) {
          InventorySystem.unequipItem(inventory, player, 'weapon');
          this.updateTabContent();
        }
      } else if (this.selectedItemIndex === 1) {
        // Unequip armor
        if (player.equipment.armor) {
          InventorySystem.unequipItem(inventory, player, 'armor');
          this.updateTabContent();
        }
      } else if (this.selectedItemIndex === 2) {
        // Unequip shield
        if (player.equipment.shield) {
          InventorySystem.unequipItem(inventory, player, 'shield');
          this.updateTabContent();
        }
      }
    }
  }

  private closeMenu(): void {
    this.canInput = false;

    this.cameras.main.fadeOut(200, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Call completion callback before stopping
      if (this.onComplete) {
        this.onComplete();
      }

      this.scene.stop();
    });
  }

  shutdown(): void {
    this.inputService.destroy();
    this.tabTexts.clear();
  }
}
