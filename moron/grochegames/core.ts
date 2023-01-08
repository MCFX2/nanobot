export interface GrocheGamesTeam {
	id: number;
	name: string;
}

export interface GrocheGamesItem {
	[x: string]: any; // allow items to declare additional properties
	name: string;
	flavorText: string;
	strBonus: number;
	spdBonus: number;
	tghBonus: number;
	mBonus: number;

	// the player currently holding the item, if applicable
	holdingPlayer?: GrocheGamesCombatant;

	// callback used for on-death activated items
	onDie?: (this: GrocheGamesItem) => void;

	// callback used for kill activated items
	onKill?: (this: GrocheGamesItem) => void;

	// callback used for paired items
	// only called on the item we had already
	onItemPickedUp?: (this: GrocheGamesItem, newItem: GrocheGamesItem) => void;

	// callback for items which have daily effects
	onDayFinished?: (this: GrocheGamesItem) => void;

	// if item is legendary (i.e. only one can ever spawn)
	legendary: boolean;
}

export interface GrocheGamesCombatant {
	team: number;

	name: string;
	pronounHe: string;
	pronounHim: string;
	picUrl: string;
	picDeadUrl: string;

	maxHP: number;
	curHP: number;
	money: number;
	strength: number;
	speed: number;
	toughness: number;

	// curses
	hasShortCircuit: boolean;
	hasExpertMode: boolean;
	hasMoronicStrength: boolean;

	// blessings
	hasInventive: boolean;
	hasLuck: boolean;
	hasDeliverance: boolean;

	inventory: GrocheGamesItem[];
}
