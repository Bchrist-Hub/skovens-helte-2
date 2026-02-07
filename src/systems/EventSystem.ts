import type { EventFlags } from '@/types';

/**
 * EventSystem - Håndterer story progression via flags
 *
 * Holder styr på hvilke events spilleren har oplevet
 * og afgør hvad der skal ske baseret på flags.
 */
export class EventSystem {
  /**
   * Check om et flag er sat
   */
  static hasFlag(flags: EventFlags, flagId: string): boolean {
    return flags[flagId] === true;
  }

  /**
   * Sæt et flag
   */
  static setFlag(flags: EventFlags, flagId: string): void {
    flags[flagId] = true;
  }

  /**
   * Fjern et flag (sjældent brugt, men kan være nyttigt)
   */
  static clearFlag(flags: EventFlags, flagId: string): void {
    flags[flagId] = false;
  }

  /**
   * Check om flere flags er sat
   */
  static hasAllFlags(flags: EventFlags, flagIds: string[]): boolean {
    return flagIds.every(id => this.hasFlag(flags, id));
  }

  /**
   * Check om mindst ét af flere flags er sat
   */
  static hasAnyFlag(flags: EventFlags, flagIds: string[]): boolean {
    return flagIds.some(id => this.hasFlag(flags, id));
  }

  /**
   * Få alle satte flags
   */
  static getSetFlags(flags: EventFlags): string[] {
    return Object.keys(flags).filter(key => flags[key] === true);
  }

  /**
   * Check om en condition string er opfyldt
   *
   * Condition format:
   * - "flag_name" - simpelt flag check
   * - "!flag_name" - negeret check (flag må IKKE være sat)
   * - "flag1 & flag2" - begge flags skal være sat
   * - "flag1 | flag2" - mindst ét flag skal være sat
   */
  static checkCondition(flags: EventFlags, condition?: string): boolean {
    if (!condition) {
      return true; // Ingen condition = altid true
    }

    // Negation: !flag_name
    if (condition.startsWith('!')) {
      const flagName = condition.substring(1).trim();
      return !this.hasFlag(flags, flagName);
    }

    // AND: flag1 & flag2
    if (condition.includes('&')) {
      const flagNames = condition.split('&').map(s => s.trim());
      return this.hasAllFlags(flags, flagNames);
    }

    // OR: flag1 | flag2
    if (condition.includes('|')) {
      const flagNames = condition.split('|').map(s => s.trim());
      return this.hasAnyFlag(flags, flagNames);
    }

    // Simple flag check
    return this.hasFlag(flags, condition.trim());
  }
}
