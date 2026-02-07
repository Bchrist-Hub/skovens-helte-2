import type { Player, Monster, CombatEvent } from '@/types';

/**
 * CombatSystem - Ren spillogik for turbaseret kamp
 *
 * Dette system er HELT adskilt fra rendering. Det modtager handlinger
 * og returnerer events der beskriver hvad der skete.
 */
export class CombatSystem {
  private player: Player;
  private enemies: Monster[];
  private isDefending: boolean = false;
  private combatEnded: boolean = false;
  private combatResult: 'victory' | 'defeat' | null = null;

  constructor(player: Player, enemies: Monster[]) {
    this.player = player;
    this.enemies = enemies;
  }

  /**
   * Udfør spillerens handling og returnér event
   */
  executePlayerAction(
    action: 'attack_normal' | 'attack_heavy' | 'defend' | 'item_heal' | 'spell_fire' | 'spell_heal',
    targetIndex: number = 0
  ): CombatEvent {
    const target = this.enemies[targetIndex];

    switch (action) {
      case 'attack_normal':
        return this.attackNormal(this.player, target);

      case 'attack_heavy':
        return this.attackHeavy(this.player, target);

      case 'defend':
        return this.defend();

      case 'item_heal':
        return this.useHealingItem();

      case 'spell_fire':
        return this.castFire(target);

      case 'spell_heal':
        return this.castHeal();

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Udfør fjende-tur og returnér event
   */
  executeEnemyTurn(enemyIndex: number): CombatEvent {
    const enemy = this.enemies[enemyIndex];

    // Vælg handling baseret på AI-type
    const action = this.selectEnemyAction(enemy);

    switch (action) {
      case 'attack':
        return this.enemyAttack(enemy);
      case 'fire_breath':
        return this.enemyFireBreath(enemy);
      case 'boss_heal':
        return this.bossHeal(enemy);
      default:
        return this.enemyAttack(enemy);
    }
  }

  /**
   * Check om kampen er slut
   */
  isCombatEnded(): boolean {
    return this.combatEnded;
  }

  /**
   * Få kampresultat
   */
  getCombatResult(): 'victory' | 'defeat' | null {
    return this.combatResult;
  }

  /**
   * Få levende fjender
   */
  getAliveEnemies(): Monster[] {
    return this.enemies.filter(e => e.currentHP > 0);
  }

  // ============================================================================
  // PLAYER ACTIONS
  // ============================================================================

  /**
   * Balanceret angreb: ATK - DEF, 95% præcision
   */
  private attackNormal(attacker: Player, target: Monster): CombatEvent {
    const accuracy = 0.95;
    const hit = Math.random() < accuracy;

    if (!hit) {
      return this.createCombatEvent(
        'player',
        'attack_normal',
        target.id,
        false,
        0,
        target.currentHP,
        `${this.player.name} angriber... men bomber!`
      );
    }

    const damage = this.calculatePhysicalDamage(
      this.getTotalAtk(attacker),
      target.stats.def,
      1.0
    );

    target.currentHP = Math.max(0, target.currentHP - damage);

    return this.createCombatEvent(
      'player',
      'attack_normal',
      target.id,
      true,
      damage,
      target.currentHP,
      `${this.player.name} angriber ${target.name}! ${damage} skade.`,
      target.currentHP === 0
    );
  }

  /**
   * Hårdt angreb: ATK * 1.5 - DEF, 70% præcision
   */
  private attackHeavy(attacker: Player, target: Monster): CombatEvent {
    const accuracy = 0.70;
    const hit = Math.random() < accuracy;

    if (!hit) {
      return this.createCombatEvent(
        'player',
        'attack_heavy',
        target.id,
        false,
        0,
        target.currentHP,
        `${this.player.name} svinger voldsomt... men rammer ikke!`
      );
    }

    const damage = this.calculatePhysicalDamage(
      this.getTotalAtk(attacker),
      target.stats.def,
      1.5
    );

    target.currentHP = Math.max(0, target.currentHP - damage);

    return this.createCombatEvent(
      'player',
      'attack_heavy',
      target.id,
      true,
      damage,
      target.currentHP,
      `${this.player.name} udfører et hårdt slag! ${damage} skade!`,
      target.currentHP === 0
    );
  }

  /**
   * Forsvar: Halverer modtaget skade næste tur
   */
  private defend(): CombatEvent {
    this.isDefending = true;

    return this.createCombatEvent(
      'player',
      'defend',
      'player',
      true,
      0,
      this.player.currentHP,
      `${this.player.name} går i forsvar!`
    );
  }

  /**
   * Brug helbredelsesdrik
   */
  private useHealingItem(): CombatEvent {
    const healAmount = 30;
    const actualHeal = Math.min(healAmount, this.player.baseStats.maxHP - this.player.currentHP);

    this.player.currentHP += actualHeal;

    return this.createCombatEvent(
      'player',
      'item_heal',
      'player',
      true,
      0,
      this.player.currentHP,
      `${this.player.name} drikker en helbredelsesdrik! +${actualHeal} HP.`,
      false,
      actualHeal
    );
  }

  /**
   * Cast Ild-magi
   */
  private castFire(target: Monster): CombatEvent {
    const mpCost = 5;

    if (this.player.currentMP < mpCost) {
      return this.createCombatEvent(
        'player',
        'spell_fire',
        target.id,
        false,
        0,
        target.currentHP,
        `Ikke nok MP!`
      );
    }

    this.player.currentMP -= mpCost;

    // Magisk skade ignorerer mere af forsvar
    const damage = Math.max(
      1,
      15 + this.player.level * 2 - Math.floor(target.stats.def * 0.3)
    );

    target.currentHP = Math.max(0, target.currentHP - damage);

    return this.createCombatEvent(
      'player',
      'spell_fire',
      target.id,
      true,
      damage,
      target.currentHP,
      `${this.player.name} kaster Ild! ${damage} magisk skade.`,
      target.currentHP === 0,
      0,
      mpCost
    );
  }

  /**
   * Cast Helbred-magi
   */
  private castHeal(): CombatEvent {
    const mpCost = 4;

    if (this.player.currentMP < mpCost) {
      return this.createCombatEvent(
        'player',
        'spell_heal',
        'player',
        false,
        0,
        this.player.currentHP,
        `Ikke nok MP!`
      );
    }

    this.player.currentMP -= mpCost;

    const healAmount = 20 + this.player.level * 3;
    const actualHeal = Math.min(healAmount, this.player.baseStats.maxHP - this.player.currentHP);

    this.player.currentHP += actualHeal;

    return this.createCombatEvent(
      'player',
      'spell_heal',
      'player',
      true,
      0,
      this.player.currentHP,
      `${this.player.name} kaster Helbred! +${actualHeal} HP.`,
      false,
      actualHeal,
      mpCost
    );
  }

  // ============================================================================
  // ENEMY ACTIONS
  // ============================================================================

  /**
   * Fjende angriber spilleren
   */
  private enemyAttack(enemy: Monster): CombatEvent {
    const accuracy = 0.90;
    const hit = Math.random() < accuracy;

    if (!hit) {
      return this.createCombatEvent(
        enemy.id,
        'attack_normal',
        'player',
        false,
        0,
        this.player.currentHP,
        `${enemy.name} angriber... men bomber!`
      );
    }

    // Beregn skade (reducer hvis spiller forsvarer)
    let damage = this.calculatePhysicalDamage(
      enemy.stats.atk,
      this.getTotalDef(this.player),
      1.0
    );

    // Forsvar reducerer skade
    if (this.isDefending) {
      damage = Math.floor(damage * 0.5);
      this.isDefending = false; // Reset forsvar efter brug
    }

    this.player.currentHP = Math.max(0, this.player.currentHP - damage);

    const defeated = this.player.currentHP === 0;

    return this.createCombatEvent(
      enemy.id,
      'attack_normal',
      'player',
      true,
      damage,
      this.player.currentHP,
      `${enemy.name} angriber! ${damage} skade.`,
      defeated
    );
  }

  /**
   * Drage fire breath attack - kraftigere end normal angreb
   */
  private enemyFireBreath(enemy: Monster): CombatEvent {
    // Fire breath har altid hit
    // Magisk skade der ignorerer noget forsvar
    let damage = Math.max(
      1,
      Math.floor(enemy.stats.atk * 1.3 - this.getTotalDef(this.player) * 0.5)
    );

    // Forsvar reducerer stadig noget skade
    if (this.isDefending) {
      damage = Math.floor(damage * 0.6); // Mindre reduktion end normal angreb
      this.isDefending = false;
    }

    this.player.currentHP = Math.max(0, this.player.currentHP - damage);

    const defeated = this.player.currentHP === 0;

    return this.createCombatEvent(
      enemy.id,
      'fire_breath',
      'player',
      true,
      damage,
      this.player.currentHP,
      `${enemy.name} ånder ild! ${damage} brændende skade!`,
      defeated
    );
  }

  /**
   * Boss healer sig selv (kun én gang per kamp)
   */
  private bossHeal(enemy: Monster): CombatEvent {
    const healAmount = Math.floor(enemy.stats.maxHP * 0.25); // Heal 25% af max HP
    const actualHeal = Math.min(healAmount, enemy.stats.maxHP - enemy.currentHP);

    enemy.currentHP += actualHeal;
    enemy.hasHealed = true; // Marker at boss har healet

    return this.createCombatEvent(
      enemy.id,
      'boss_heal',
      enemy.id,
      true,
      0,
      enemy.currentHP,
      `${enemy.name} heler sine sår! +${actualHeal} HP.`,
      false,
      actualHeal
    );
  }

  /**
   * Vælg fjende-handling baseret på AI-type
   */
  private selectEnemyAction(enemy: Monster): string {
    // Boss AI (Dragen)
    if (enemy.aiType === 'boss') {
      // Healing ved lav HP (kun én gang per kamp)
      if (enemy.currentHP < enemy.stats.maxHP * 0.3 && !enemy.hasHealed) {
        return 'boss_heal';
      }

      // Fase 2: Under 50% HP - brug mere fire breath
      const hpPercent = enemy.currentHP / enemy.stats.maxHP;
      if (hpPercent < 0.5) {
        // 70% chance for fire breath i fase 2
        return Math.random() < 0.7 ? 'fire_breath' : 'attack';
      } else {
        // Fase 1: 40% chance for fire breath
        return Math.random() < 0.4 ? 'fire_breath' : 'attack';
      }
    }

    // Aggressive AI: Angriber altid
    if (enemy.aiType === 'aggressive') {
      return 'attack';
    }

    // Basic AI: Angriber altid
    return 'attack';
  }

  // ============================================================================
  // COMBAT FORMULAS
  // ============================================================================

  /**
   * Beregn fysisk skade
   */
  private calculatePhysicalDamage(atk: number, def: number, modifier: number): number {
    return Math.max(1, Math.floor(atk * modifier - def));
  }

  /**
   * Få spillerens totale ATK (base + equipment)
   */
  private getTotalAtk(player: Player): number {
    let totalAtk = player.baseStats.atk;

    if (player.equipment.weapon?.stats?.atk) {
      totalAtk += player.equipment.weapon.stats.atk;
    }

    return totalAtk;
  }

  /**
   * Få spillerens totale DEF (base + equipment)
   */
  private getTotalDef(player: Player): number {
    let totalDef = player.baseStats.def;

    if (player.equipment.armor?.stats?.def) {
      totalDef += player.equipment.armor.stats.def;
    }

    return totalDef;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Opret et CombatEvent objekt
   */
  private createCombatEvent(
    actor: string,
    action: string,
    target: string,
    hit: boolean,
    damage: number,
    resultingHP: number,
    message: string,
    targetDefeated: boolean = false,
    healing: number = 0,
    mpCost: number = 0
  ): CombatEvent {
    // Check om kampen er slut
    if (targetDefeated) {
      if (target === 'player') {
        this.combatEnded = true;
        this.combatResult = 'defeat';
      } else {
        // Check om alle fjender er døde
        const aliveEnemies = this.getAliveEnemies();
        if (aliveEnemies.length === 0) {
          this.combatEnded = true;
          this.combatResult = 'victory';
        }
      }
    }

    return {
      actor,
      action,
      target,
      hit,
      damage,
      healing,
      mpCost,
      resultingHP,
      message,
      combatEnded: this.combatEnded,
      combatResult: this.combatResult
    };
  }
}
