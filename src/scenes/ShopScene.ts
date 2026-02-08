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
  private mode: 'buy' | 'sell' = 'buy'; // Shop mode
  private selectedItemIndex: number = 0;
  private scrollOffset: number = 0; // For paginating long shop lists
  private canInput: boolean = false;
  private purchaseQuantity: number = 1; // Quantity to purchase/sell

  // Callback when shop closes
  private onComplete?: () => void;

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
  init(data: { shop: Shop; onComplete?: () => void }): void {
    this.shop = data.shop;
    this.onComplete = data.onComplete;
    this.mode = 'buy';
    this.selectedItemIndex = 0;
    this.purchaseQuantity = 1;
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

    // Toggle mode (Tab key)
    const keyTab = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    if (keyTab && Phaser.Input.Keyboard.JustDown(keyTab)) {
      this.mode = this.mode === 'buy' ? 'sell' : 'buy';
      this.selectedItemIndex = 0;
      this.scrollOffset = 0;
      this.purchaseQuantity = 1;
      this.updateItemList();
      return;
    }

    // Navigate items
    if (this.inputService.justPressed('up')) {
      this.selectedItemIndex = Math.max(0, this.selectedItemIndex - 1);
      this.purchaseQuantity = 1; // Reset quantity when changing items
      this.updateItemList();
    }

    if (this.inputService.justPressed('down')) {
      const maxIndex = this.mode === 'buy' ? this.shop.items.length - 1 : this.gameState.getInventory().items.length - 1;
      this.selectedItemIndex = Math.min(maxIndex, this.selectedItemIndex + 1);
      this.purchaseQuantity = 1; // Reset quantity when changing items
      this.updateItemList();
    }

    // Adjust quantity
    if (this.inputService.justPressed('left')) {
      this.purchaseQuantity = Math.max(1, this.purchaseQuantity - 1);
      this.updateItemList();
    }

    if (this.inputService.justPressed('right')) {
      if (this.mode === 'buy') {
        // Max quantity limited by gold and inventory space (max 99)
        const shopItem = this.shop.items[this.selectedItemIndex];
        if (shopItem) {
          const gold = this.gameState.getGold();
          const maxAffordable = Math.floor(gold / shopItem.price);
          // Only increase if we can afford more, and ensure minimum is 1
          if (maxAffordable > 0) {
            this.purchaseQuantity = Math.min(99, maxAffordable, this.purchaseQuantity + 1);
            this.updateItemList();
          }
        }
      } else {
        // Sell mode: max quantity is inventory quantity
        const inventory = this.gameState.getInventory();
        const selectedEntry = inventory.items[this.selectedItemIndex];
        if (selectedEntry) {
          this.purchaseQuantity = Math.min(selectedEntry.quantity, 99, this.purchaseQuantity + 1);
          this.updateItemList();
        }
      }
    }

    // Buy or sell item
    if (this.inputService.justPressed('action')) {
      if (this.mode === 'buy') {
        this.buySelectedItem();
      } else {
        this.sellSelectedItem();
      }
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

    // Shop name and mode
    this.add.text(width / 2, 15, this.shop.name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 30, '[TAB] til KØB/SÆLG', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#888888'
    }).setOrigin(0.5);

    // Gold display
    this.goldText = this.add.text(width / 2, 45, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffff00'
    }).setOrigin(0.5);

    // Instructions (will be updated based on mode)
    this.add.text(20, height - 35, 'Op/Ned: Vælg | ←/→: Antal | Enter: Handling | ESC: Luk', {
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
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Update gold text with mode indicator
    const modeText = this.mode === 'buy' ? 'KØB' : 'SÆLG';
    const modeColor = this.mode === 'buy' ? '#00ff00' : '#ff8800';
    this.goldText.setText(`${modeText} | Guld: ${gold}g`);
    this.goldText.setColor(modeColor);

    // Clear previous item texts
    this.itemTexts.forEach(text => text.destroy());
    this.itemTexts = [];

    // Branch based on mode
    if (this.mode === 'sell') {
      this.showSellItems(width, height);
      return;
    }

    // === BUY MODE ===
    // Define scrollable area bounds
    const itemAreaTop = 70;
    const itemAreaBottom = height - 50; // Leave space for instructions (at height - 35)
    const itemAreaHeight = itemAreaBottom - itemAreaTop;

    // Calculate how many items fit (better estimate: 35px per item, 75px for selected)
    const avgItemHeight = 40;
    const maxVisibleItems = Math.max(3, Math.floor(itemAreaHeight / avgItemHeight));

    // Auto-scroll: ensure selected item is visible
    if (this.selectedItemIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedItemIndex;
    } else if (this.selectedItemIndex >= this.scrollOffset + maxVisibleItems) {
      this.scrollOffset = this.selectedItemIndex - maxVisibleItems + 1;
    }

    // Render only visible items
    let y = itemAreaTop;
    const visibleItems = this.shop.items.slice(this.scrollOffset, this.scrollOffset + maxVisibleItems);

    visibleItems.forEach((shopItem, visibleIndex) => {
      const actualIndex = this.scrollOffset + visibleIndex;
      const item = getItem(shopItem.itemId);
      if (!item) return;

      const isSelected = actualIndex === this.selectedItemIndex;
      const totalCost = shopItem.price * this.purchaseQuantity;
      const canAfford = gold >= totalCost;

      // Stop rendering if we've exceeded the visible area
      if (y >= itemAreaBottom) {
        return;
      }

      // Determine color
      let nameColor = '#888888'; // Can't afford
      if (canAfford) {
        nameColor = isSelected ? '#ffff00' : '#ffffff';
      }

      // Line 1: Item name (left) and Price (right)
      const nameText = this.add.text(
        25,
        y,
        item.name,
        {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: nameColor,
          fontStyle: isSelected ? 'bold' : 'normal'
        }
      );
      this.itemTexts.push(nameText);

      const priceText = this.add.text(
        width - 80,
        y,
        `${shopItem.price}g`,
        {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: nameColor,
          fontStyle: isSelected ? 'bold' : 'normal'
        }
      );
      this.itemTexts.push(priceText);

      y += 16; // Move to next line

      // Show details only if selected
      if (isSelected) {
        // Line 2: Description
        const desc = this.add.text(
          30,
          y,
          item.description,
          {
            fontFamily: 'Arial',
            fontSize: '9px',
            color: '#aaaaaa',
            wordWrap: { width: width - 120 }
          }
        );
        this.itemTexts.push(desc);

        y += desc.height + 2;

        // Line 3: Stats (if equipment)
        if (item.stats) {
          const statsText = [];
          if (item.stats.atk) statsText.push(`ATK +${item.stats.atk}`);
          if (item.stats.def) statsText.push(`DEF +${item.stats.def}`);

          if (statsText.length > 0) {
            const stats = this.add.text(
              30,
              y,
              `[${statsText.join(' | ')}]`,
              {
                fontFamily: 'Arial',
                fontSize: '9px',
                color: '#00dd00'
              }
            );
            this.itemTexts.push(stats);
            y += stats.height + 2;
          }
        }

        // Line 4: Quantity selector and total
        const quantityText = this.add.text(
          30,
          y,
          `Antal: ${this.purchaseQuantity}  (←/→)`,
          {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#ffdd00'
          }
        );
        this.itemTexts.push(quantityText);

        if (this.purchaseQuantity > 1) {
          const totalText = this.add.text(
            width - 110,
            y,
            `Total: ${totalCost}g`,
            {
              fontFamily: 'Arial',
              fontSize: '10px',
              color: canAfford ? '#00ff00' : '#ff0000',
              fontStyle: 'bold'
            }
          );
          this.itemTexts.push(totalText);
        }

        y += 18; // Extra spacing after selected item
      }

      y += 6; // Spacing between items
    });

    // Show scroll indicators (outside the item area)
    if (this.scrollOffset > 0) {
      const upArrow = this.add.text(width - 25, itemAreaTop, '▲', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffff00'
      });
      this.itemTexts.push(upArrow);
    }

    if (this.scrollOffset + maxVisibleItems < this.shop.items.length) {
      const downArrow = this.add.text(width - 25, itemAreaBottom - 15, '▼', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffff00'
      });
      this.itemTexts.push(downArrow);
    }
  }

  private buySelectedItem(): void {
    const shopItem = this.shop.items[this.selectedItemIndex];
    if (!shopItem) return;

    // Safety check: ensure quantity is at least 1
    if (this.purchaseQuantity < 1) {
      this.purchaseQuantity = 1;
      this.updateItemList();
      return;
    }

    const inventory = this.gameState.getInventory();
    let gold = this.gameState.getGold();
    const totalCost = shopItem.price * this.purchaseQuantity;

    // Check if player can afford the total
    if (gold < totalCost) {
      this.showMessage('Ikke nok guld!', '#ff0000');
      this.updateItemList();
      return;
    }

    // Try to buy the items one by one
    let successfulPurchases = 0;
    for (let i = 0; i < this.purchaseQuantity; i++) {
      const result = ShopSystem.buyItem(inventory, gold, shopItem);

      if (result.success) {
        gold = result.gold;
        successfulPurchases++;
      } else {
        // Stop if we can't buy more (inventory full or out of stock)
        if (successfulPurchases > 0) {
          this.showMessage(`Købte ${successfulPurchases}x ${getItem(shopItem.itemId)?.name}. ${result.message}`, '#ffaa00');
        } else {
          this.showMessage(result.message, '#ff0000');
        }
        this.gameState.setGold(gold);
        this.purchaseQuantity = 1; // Reset quantity
        this.updateItemList();
        return;
      }
    }

    // All purchases successful
    this.gameState.setGold(gold);
    const item = getItem(shopItem.itemId);
    if (successfulPurchases > 1) {
      this.showMessage(`Købte ${successfulPurchases}x ${item?.name} for ${totalCost}g!`, '#00ff00');
    } else {
      this.showMessage(`Købte ${item?.name} for ${shopItem.price}g!`, '#00ff00');
    }

    this.purchaseQuantity = 1; // Reset quantity after purchase
    this.updateItemList();
  }

  /**
   * Show sell items (player inventory)
   */
  private showSellItems(width: number, height: number): void {
    const inventory = this.gameState.getInventory();
    const itemAreaTop = 70;
    const itemAreaBottom = height - 50;
    const itemAreaHeight = itemAreaBottom - itemAreaTop;
    const avgItemHeight = 40;
    const maxVisibleItems = Math.max(3, Math.floor(itemAreaHeight / avgItemHeight));

    if (inventory.items.length === 0) {
      const emptyText = this.add.text(width / 2, itemAreaTop + 30, 'Intet at sælge', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5);
      this.itemTexts.push(emptyText);
      return;
    }

    // Auto-scroll
    if (this.selectedItemIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedItemIndex;
    } else if (this.selectedItemIndex >= this.scrollOffset + maxVisibleItems) {
      this.scrollOffset = this.selectedItemIndex - maxVisibleItems + 1;
    }

    // Render inventory items
    let y = itemAreaTop;
    const visibleItems = inventory.items.slice(this.scrollOffset, this.scrollOffset + maxVisibleItems);

    visibleItems.forEach((invEntry, visibleIndex) => {
      const actualIndex = this.scrollOffset + visibleIndex;
      const item = invEntry.item;
      const isSelected = actualIndex === this.selectedItemIndex;

      // Calculate sell price (half of shop price)
      let sellPrice = this.calculateSellPrice(item);
      const totalValue = sellPrice * this.purchaseQuantity;

      if (y >= itemAreaBottom) return;

      const nameColor = isSelected ? '#ffff00' : '#ffffff';

      // Item name and quantity
      const nameText = this.add.text(25, y, `${item.name} x${invEntry.quantity}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: nameColor,
        fontStyle: isSelected ? 'bold' : 'normal'
      });
      this.itemTexts.push(nameText);

      // Sell price
      const priceText = this.add.text(width - 80, y, `${sellPrice}g`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ff8800',
        fontStyle: isSelected ? 'bold' : 'normal'
      });
      this.itemTexts.push(priceText);

      y += 16;

      if (isSelected) {
        // Description
        const desc = this.add.text(30, y, item.description, {
          fontFamily: 'Arial',
          fontSize: '9px',
          color: '#aaaaaa',
          wordWrap: { width: width - 120 }
        });
        this.itemTexts.push(desc);
        y += desc.height + 2;

        // Quantity selector
        const maxSellQty = Math.min(invEntry.quantity, 99);
        if (this.purchaseQuantity > maxSellQty) {
          this.purchaseQuantity = maxSellQty;
        }

        const qtyText = this.add.text(30, y, `Antal: ${this.purchaseQuantity} / ${invEntry.quantity}  (←/→)`, {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#ffdd00'
        });
        this.itemTexts.push(qtyText);

        if (this.purchaseQuantity > 1) {
          const totalText = this.add.text(width - 110, y, `Total: ${totalValue}g`, {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#00ff00',
            fontStyle: 'bold'
          });
          this.itemTexts.push(totalText);
        }

        y += 18;
      }

      y += 6;
    });

    // Scroll indicators
    if (this.scrollOffset > 0) {
      const upArrow = this.add.text(width - 25, itemAreaTop, '▲', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffff00'
      });
      this.itemTexts.push(upArrow);
    }

    if (this.scrollOffset + maxVisibleItems < inventory.items.length) {
      const downArrow = this.add.text(width - 25, itemAreaBottom - 15, '▼', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffff00'
      });
      this.itemTexts.push(downArrow);
    }
  }

  /**
   * Calculate sell price (half of typical shop price)
   */
  private calculateSellPrice(item: any): number {
    let sellPrice = 5; // Minimum

    if (item.type === 'consumable') {
      if (item.effect?.value) {
        sellPrice = Math.floor(item.effect.value / 3);
      }
    } else if (item.type === 'weapon') {
      sellPrice = Math.floor((item.stats?.atk || 1) * 5);
    } else if (item.type === 'armor' || item.type === 'shield') {
      sellPrice = Math.floor((item.stats?.def || 1) * 5);
    }

    return Math.max(1, sellPrice);
  }

  /**
   * Sell selected item
   */
  private sellSelectedItem(): void {
    const inventory = this.gameState.getInventory();
    const selectedEntry = inventory.items[this.selectedItemIndex];

    if (!selectedEntry) return;

    const item = selectedEntry.item;
    const sellPrice = this.calculateSellPrice(item);
    const quantityToSell = Math.min(this.purchaseQuantity, selectedEntry.quantity);

    if (quantityToSell < 1) return;

    const totalValue = sellPrice * quantityToSell;

    // Remove items from inventory
    const inv = this.gameState.getInventory();
    for (let i = 0; i < quantityToSell; i++) {
      const entry = inv.items.find(e => e.item.id === item.id);
      if (!entry || entry.quantity === 0) break;
      entry.quantity--;
      if (entry.quantity === 0) {
        inv.items = inv.items.filter(e => e !== entry);
      }
    }

    // Add gold
    this.gameState.addGold(totalValue);

    // Show message
    if (quantityToSell > 1) {
      this.showMessage(`Solgte ${quantityToSell}x ${item.name} for ${totalValue}g!`, '#00ff00');
    } else {
      this.showMessage(`Solgte ${item.name} for ${sellPrice}g!`, '#00ff00');
    }

    // Reset and update
    this.purchaseQuantity = 1;
    this.selectedItemIndex = Math.min(this.selectedItemIndex, Math.max(0, inventory.items.length - 1));
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
      // Call completion callback before stopping
      if (this.onComplete) {
        this.onComplete();
      }

      this.scene.stop();
    });
  }

  shutdown(): void {
    this.inputService.destroy();
    this.itemTexts = [];
    this.onComplete = undefined;
  }
}
