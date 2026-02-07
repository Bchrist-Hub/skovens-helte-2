import type { GameState, Player, Inventory, EventFlags } from '@/types';
import { InventorySystem } from './InventorySystem';
import { STARTER_ITEMS, getItem } from '@/data/items';

/**
 * GameState holder alle spildata der skal gemmes/loades.
 * Dette er den centrale "single source of truth" for spillets tilstand.
 */
export class GameStateManager {
  private static instance: GameStateManager;
  private state: GameState;

  private constructor() {
    this.state = this.createNewGame();
  }

  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  getState(): GameState {
    return this.state;
  }

  getPlayer(): Player {
    return this.state.player;
  }

  getInventory(): Inventory {
    return this.state.inventory;
  }

  getEventFlags(): EventFlags {
    return this.state.eventFlags;
  }

  setEventFlag(flag: string, value: boolean): void {
    this.state.eventFlags[flag] = value;
  }

  hasEventFlag(flag: string): boolean {
    return this.state.eventFlags[flag] === true;
  }

  setPlayerPosition(x: number, y: number): void {
    this.state.playerPosition = { x, y };
  }

  setCurrentMap(mapName: string): void {
    this.state.currentMap = mapName;
  }

  incrementEncounterSteps(): void {
    this.state.encounterSteps++;
  }

  resetEncounterSteps(): void {
    this.state.encounterSteps = 0;
  }

  getGold(): number {
    return this.state.gold;
  }

  setGold(amount: number): void {
    this.state.gold = Math.max(0, amount); // Guld kan ikke være negativt
  }

  addGold(amount: number): void {
    this.state.gold += amount;
  }

  removeGold(amount: number): boolean {
    if (this.state.gold >= amount) {
      this.state.gold -= amount;
      return true;
    }
    return false;
  }

  /**
   * Opret en ny spil-tilstand med default værdier
   */
  private createNewGame(): GameState {
    const player: Player = {
      name: 'Helten',
      level: 1,
      xp: 0,
      xpToNext: 20,
      baseStats: {
        maxHP: 40,
        maxMP: 15,
        atk: 8,
        def: 4
      },
      currentHP: 40,
      currentMP: 15,
      equipment: {
        weapon: null,
        armor: null
      }
    };

    const inventory: Inventory = {
      items: [],
      maxSlots: 20
    };

    // Tilføj starter-items
    STARTER_ITEMS.forEach(({ itemId, quantity }) => {
      InventorySystem.addItem(inventory, itemId, quantity);
    });

    // Auto-equip starter våben og rustning
    const starterWeapon = getItem('wooden_sword');
    const starterArmor = getItem('leather_armor');

    if (starterWeapon) {
      player.equipment.weapon = starterWeapon;
      InventorySystem.removeItem(inventory, 'wooden_sword', 1);
    }

    if (starterArmor) {
      player.equipment.armor = starterArmor;
      InventorySystem.removeItem(inventory, 'leather_armor', 1);
    }

    return {
      player,
      inventory,
      eventFlags: {},
      currentMap: 'village',
      playerPosition: { x: 8, y: 8 },
      playTime: 0,
      encounterSteps: 0,
      gold: 100 // Starter med 100 guld
    };
  }

  /**
   * Gem spil til localStorage
   */
  save(): boolean {
    try {
      const saveData = JSON.stringify(this.state);
      localStorage.setItem('skovens_helte_save', saveData);
      console.log('Game saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  /**
   * Load spil fra localStorage
   */
  load(): boolean {
    try {
      const saveData = localStorage.getItem('skovens_helte_save');
      if (!saveData) {
        console.log('No save data found');
        return false;
      }

      this.state = JSON.parse(saveData);
      console.log('Game loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  /**
   * Check om der findes save data
   */
  hasSaveData(): boolean {
    return localStorage.getItem('skovens_helte_save') !== null;
  }

  /**
   * Start nyt spil (reset state)
   */
  newGame(): void {
    this.state = this.createNewGame();
    console.log('New game started');
  }

  /**
   * Slet save data
   */
  deleteSave(): void {
    localStorage.removeItem('skovens_helte_save');
    console.log('Save data deleted');
  }
}
