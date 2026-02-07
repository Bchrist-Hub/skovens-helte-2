import type { DialogEntry } from '@/types';

/**
 * Dialog data for NPCs, events, and story
 *
 * Dialog entries kan have conditions, flags, og next references
 */
export const DIALOGS: Record<string, DialogEntry> = {
  // ============================================================================
  // Village NPCs
  // ============================================================================

  elder_greeting: {
    id: 'elder_greeting',
    speaker: 'Landsby Ældste',
    lines: [
      'Velkommen, unge helt!',
      'Vores landsby er i fare. En frygtelig drage har taget til bolig i bjergene mod nord.',
      'Ingen tør gå gennem skoven længere. Vil du hjælpe os?'
    ],
    condition: '!met_elder',
    setsFlag: 'met_elder',
    next: 'elder_quest'
  },

  elder_quest: {
    id: 'elder_quest',
    speaker: 'Landsby Ældste',
    lines: [
      'Dragen har brændt marker og kidnappet rejsende.',
      'Hvis du besejrer den, vil du blive hyldet som vor helt!',
      'Søg mod nord gennem skoven. Men vær forsigtig - der er monstre derude.'
    ],
    condition: '!dragon_defeated',
    setsFlag: 'quest_dragon_active'
  },

  elder_victory: {
    id: 'elder_victory',
    speaker: 'Landsby Ældste',
    lines: [
      'Du vendte tilbage! Og dragen er besejret!',
      'Hele landsbyen takker dig, helt!',
      'Din tapperhed vil blive husket i generationer!'
    ],
    condition: 'dragon_defeated'
  },

  shopkeeper_greeting: {
    id: 'shopkeeper_greeting',
    speaker: 'Købmand',
    lines: [
      'Velkommen til min butik!',
      'Jeg har alt du behøver til dit eventyr.',
      'Vil du se mit udvalg?'
    ]
  },

  villager_woman_greeting: {
    id: 'villager_woman_greeting',
    speaker: 'Landsbykvinde',
    lines: [
      'Hej rejsende!',
      'Pas på derude i skoven. Der er farer overalt.',
      'Sørg for at købe nogle helbredelsespotion før du tager afsted!'
    ],
    condition: '!dragon_defeated'
  },

  villager_woman_victory: {
    id: 'villager_woman_victory',
    speaker: 'Landsbykvinde',
    lines: [
      'Du er vores helt!',
      'Tak fordi du reddede vores landsby!'
    ],
    condition: 'dragon_defeated'
  },

  worried_man_greeting: {
    id: 'worried_man_greeting',
    speaker: 'Bekymret Mand',
    lines: [
      'Min bror rejste mod nord for tre dage siden...',
      'Han er ikke kommet tilbage. Jeg frygter dragen har taget ham.',
      'Vær forsigtig derude!'
    ],
    condition: '!dragon_defeated'
  },

  worried_man_victory: {
    id: 'worried_man_victory',
    speaker: 'Bekymret Mand',
    lines: [
      'Min bror kom hjem i går!',
      'Han sagde at dragen pludselig forsvandt. Det må have været dig!',
      'Tusind tak, helt!'
    ],
    condition: 'dragon_defeated'
  },

  guard_greeting: {
    id: 'guard_greeting',
    speaker: 'Vagt',
    lines: [
      'Vejen mod nord er spærret.',
      'Dragen er for farlig. Kun erfarne eventyrere må passere.',
      'Hvis du virkelig vil, kan jeg lade dig passere... men det er på eget ansvar.'
    ],
    condition: '!dragon_defeated'
  },

  guard_victory: {
    id: 'guard_victory',
    speaker: 'Vagt',
    lines: [
      'Du besejrede dragen!',
      'Vejen er nu sikker igen. Landsbyen er i evig gæld til dig!',
      'Du er altid velkommen her, helt!'
    ],
    condition: 'dragon_defeated'
  },

  // ============================================================================
  // Tutorial & First Combat
  // ============================================================================

  first_combat_intro: {
    id: 'first_combat_intro',
    speaker: 'Fortæller',
    lines: [
      'En vild ulv springer frem!',
      'Brug piletasterne til at vælge handling.',
      'Tryk Enter for at angribe!'
    ]
  },

  // ============================================================================
  // Boss Fight
  // ============================================================================

  dragon_encounter: {
    id: 'dragon_encounter',
    speaker: 'Rød Drage',
    lines: [
      'GRAAAH! Endnu en dødelig kommer for at udfordre mig?',
      'Jeg har brændt hundrede helte til aske!',
      'Du vil ikke være anderledes, menneske!'
    ],
    setsFlag: 'dragon_encountered'
  },

  dragon_victory: {
    id: 'dragon_victory',
    speaker: 'System',
    lines: [
      'Dragen falder med et tungt drøn!',
      'Du har besejret den frygtelige drage!',
      'Landsbyen er nu sikker!'
    ],
    setsFlag: 'dragon_defeated'
  }
};

/**
 * Få en dialog entry ved ID
 */
export function getDialog(dialogId: string): DialogEntry | undefined {
  return DIALOGS[dialogId];
}

/**
 * Få den korrekte dialog baseret på event flags
 *
 * Checker om der er en variant med condition der matcher
 */
export function getDialogWithConditions(
  baseDialogId: string,
  eventFlags: Record<string, boolean>
): DialogEntry | undefined {
  // Først check om der er en variant der matcher conditions
  const variants = Object.values(DIALOGS).filter(
    d => d.id.startsWith(baseDialogId)
  );

  for (const variant of variants) {
    if (!variant.condition) continue;

    // Simple condition check (kan udvides senere)
    if (eventFlags[variant.condition]) {
      return variant;
    }
  }

  // Fallback til base dialog
  return DIALOGS[baseDialogId];
}
