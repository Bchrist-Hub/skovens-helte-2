import Phaser from 'phaser';
import { InputService } from '@/services/InputService';
import { GameStateManager } from '@/systems/GameState';
import { ShopSystem, type Shop } from '@/systems/ShopSystem';
import { getItem } from '@/data/items';

/**
 * ShopScene - Overlay scene til at købe items
 *
 * Viser shop inventory, priser, og spillerens guld
 */
export class ShopScene extends Phaser.Scene {
  private inputService!: InputService;
  private gameState!: GameStateManager;
  private shop!: Shop;

  // State
  private selectedItemIndex: number = 0;
  private scrollOffset: number = 0; // For paginating long shop lists
  private canInput: boolean = false;

  // UI elements
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  /**
   * Initialize med shop data
   */
  init(data: { shop: Shop }): void {
    this.shop = data.shop;
    this.selectedItemIndex = 0;
    this.canInput = false;
    this.itemTexts = [];
  }

  create(): void {
    this.inputService = new InputService(this);
    this.gameState = GameStateManager.getInstance();

    // Create UI
    this.createShopBackground();
    this.createShopUI();

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

    // Close shop
    if (this.inputService.justPressed('cancel')) {
      this.closeShop();
      return;
    }

    // Navigate items
    if (this.inputService.justPressed('up')) {
      this.selectedItemIndex = Math.max(0, this.selectedItemIndex - 1);
      this.updateItemList();
    }

    if (this.inputService.justPressed('down')) {
      this.selectedItemIndex = Math.min(this.shop.items.length - 1, this.selectedItemIndex + 1);
      this.updateItemList();
    }

    // Buy item
    if (this.inputService.justPressed('action')) {
      this.buySelectedItem();
    }
  }

  private createShopBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    // Shop box
    const boxWidth = width - 20;
    const boxHeight = height - 20;
    const boxX = 10;
    const boxY = 10;

    const shopBox = this.add.graphics();
    shopBox.fillStyle(0x101840, 0.95);
    shopBox.fillRect(boxX, boxY, boxWidth, boxHeight);
    shopBox.lineStyle(2, 0xffffff, 1);
    shopBox.strokeRect(boxX, boxY, boxWidth, boxHeight);
  }

  private createShopUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Shop name
    this.add.text(width / 2, 20, this.shop.name, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Gold display
    this.goldText = this.add.text(width / 2, 40, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffff00'
    }).setOrigin(0.5);

    // Instructions
    this.add.text(20, height - 35, 'Op/Ned: Vælg | Enter: Køb | ESC: Luk', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#888888'
    });

    // Message text
    this.messageText = this.add.text(width / 2, height - 20, '', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5);

    // Create item list
    this.updateItemList();
  }

  private updateItemList(): void {
    const gold = this.gameState.getGold();

    // Update gold text
    this.goldText.setText(`Guld: ${gold}g`);

    // Clear previous item texts
    this.itemTexts.forEach(text => text.destroy());
    this.itemTexts = [];

    const maxVisibleItems = 6; // Maximum items shown at once

    // Auto-scroll: ensure selected item is visible
    if (this.selectedItemIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedItemIndex;
    } else if (this.selectedItemIndex >= this.scrollOffset + maxVisibleItems) {
      this.scrollOffset = this.selectedItemIndex - maxVisibleItems + 1;
    }

    // Render only visible items
    let y = 65;
    const visibleItems = this.shop.items.slice(this.scrollOffset, this.scrollOffset + maxVisibleItems);

    visibleItems.forEach((shopItem, visibleIndex) => {
      const actualIndex = this.scrollOffset + visibleIndex;
      const item = getItem(shopItem.itemId);
      if (!item) return;

      const isSelected = actualIndex === this.selectedItemIndex;
      const canAfford = gold >= shopItem.price;

      // Determine color
      let color = '#888888'; // Can't afford
      if (canAfford) {
        color = isSelected ? '#ffff00' : '#ffffff';
      }

      // Item name and price
      const text = this.add.text(
        25,
        y,
        `${item.name} - ${shopItem.price}g`,
        {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: color,
          fontStyle: isSelected ? 'bold' : 'normal'
        }
      );
      this.itemTexts.push(text);

      // Item description (if selected)
      if (isSelected) {
        const desc = this.add.text(
          35,
          y + 14,
          item.description,
          {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#888888',
            wordWrap: { width: 180 } // Prevent text overflow
          }
        );
        this.itemTexts.push(desc);

        // Show stats if equipment
        if (item.stats) {
          const statsText = [];
          if (item.stats.atk) statsText.push(`ATK +${item.stats.atk}`);
          if (item.stats.def) statsText.push(`DEF +${item.stats.def}`);

          if (statsText.length > 0) {
            const stats = this.add.text(
              35,
              y + 26,
              statsText.join(', '),
              {
                fontFamily: 'Arial',
                fontSize: '10px',
                color: '#00ff00'
              }
            );
            this.itemTexts.push(stats);
          }
        }

        y += 42;
      } else {
        y += 18;
      }
    });

    // Show scroll indicators
    const height = this.cameras.main.height;

    if (this.scrollOffset > 0) {
      const upArrow = this.add.text(200, 65, '▲', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      });
      this.itemTexts.push(upArrow);
    }

    if (this.scrollOffset + maxVisibleItems < this.shop.items.length) {
      const downArrow = this.add.text(200, height - 60, '▼', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      });
      this.itemTexts.push(downArrow);
    }
  }

  private buySelectedItem(): void {
    const shopItem = this.shop.items[this.selectedItemIndex];
    if (!shopItem) return;

    const inventory = this.gameState.getInventory();
    const gold = this.gameState.getGold();

    const result = ShopSystem.buyItem(inventory, gold, shopItem);

    if (result.success) {
      this.gameState.setGold(result.gold);
      this.showMessage(result.message, '#00ff00');
    } else {
      this.showMessage(result.message, '#ff0000');
    }

    // Update display
    this.updateItemList();
  }

  private showMessage(message: string, color: string): void {
    this.messageText.setText(message);
    this.messageText.setColor(color);

    // Clear message after delay
    this.time.delayedCall(2000, () => {
      this.messageText.setText('');
    });
  }

  private closeShop(): void {
    this.canInput = false;

    this.cameras.main.fadeOut(200, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
    });
  }

  shutdown(): void {
    this.inputService.destroy();
    this.itemTexts = [];
  }
}
