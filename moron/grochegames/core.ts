import { readCacheFileAsJson, writeCacheFile } from "../util";
import { AllGrocheGamesItems, InvalidItem } from "./items";

export interface GrocheGamesItem {
	[x: string]: unknown; // allow items to declare additional properties
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

	// if item is special (i.e. it cannot spawn randomly)
	special: boolean;

	// for items that can offer advantage/disadvantage, call these to see if buff is available. not guaranteed to be deterministic.
	givesAdvantage?: (this: GrocheGamesItem) => boolean;
	givesDisadvantage?: (this: GrocheGamesItem) => boolean;
}

export class GrocheGamesCombatant {
	team = "";
	// channel ID
	teamId = "";

	registrationComplete = false;
	// not the most elegant solution but the easiest
	backgroundMsgIds: string[] = [];

	name = "unnamed";
	pronounHe = "he";
	pronounHim = "him";
	// empty for bots, otherwise it's the discord user ID
	id = "";
	picUrl = "";
	picDeadUrl = "";
	deathQuote = "";

	maxHP = 0;
	curHP = 0;
	baseMoney = 0;
	baseStrength = 0;
	baseSpeed = 0;
	baseToughness = 0;

	// curses
	hasShortCircuit = false;
	hasExpertMode = false;
	hasMoronicRage = false;

	// blessings
	hasInventive = false;
	hasLuck = false;
	hasDeliverance = false;

	inventory: GrocheGamesItem[] = [];

	public get strength(): number {
		return this.inventory.reduce((prev, cur) => {
			return prev + cur.strBonus;
		}, this.baseStrength);
	}

	public get speed(): number {
		return this.inventory.reduce((prev, cur) => {
			return prev + cur.spdBonus;
		}, this.baseSpeed);
	}

	public get toughness(): number {
		return this.inventory.reduce((prev, cur) => {
			return prev + cur.tghBonus;
		}, this.baseToughness);
	}

	public get money(): number {
		return this.inventory.reduce((prev, cur) => {
			return prev + cur.mBonus;
		}, this.baseMoney);
	}

	public get totalAdvantage(): number {
		return this.inventory.reduce(
			(prev, cur) => {
				return prev + (cur.givesAdvantage?.() ? 1 : 0);
			},
			this.hasLuck ? 2 : 1,
		);
	}

	public get totalDisadvantage(): number {
		return this.inventory.reduce((prev, cur) => {
			return prev + (cur.givesAdvantage?.() ? 1 : 0);
		}, 1);
	}
}

const combatantsFile = "grochegames-combatants.json";
class GrocheGamesCore {
	// undefined is used here as a signal value to indicate we haven't initialized from file yet
	private grocheCombatants?: GrocheGamesCombatant[] = undefined;

	public get combatants(): GrocheGamesCombatant[] {
		if (this.grocheCombatants === undefined) {
			this.grocheCombatants = readCacheFileAsJson(combatantsFile);
			// reading JSON failed, default to empty array
			if (this.grocheCombatants === undefined) {
				this.grocheCombatants = [];
			} else {
				this.refreshInventories();
			}
		}
		return this.grocheCombatants;
	}

	// since inventory data doesn't include callbacks
	// call this to refresh the inventory with the items found in AllGrocheGamesItems
	private refreshInventories() {
		if (!this.grocheCombatants) {
			return;
		}
		for (const combatant of this.grocheCombatants) {
			combatant.inventory = combatant.inventory.map(
				(storedItem) =>
					AllGrocheGamesItems.find(
						(trueItem) => trueItem.name === storedItem.name,
					) ?? InvalidItem, // InvalidItem should only be possible when an item in the master list is removed or renamed mid-game
			);
		}
	}

	public set combatants(list: GrocheGamesCombatant[]) {
		this.grocheCombatants = list;

		if (this.grocheCombatants) {
			writeCacheFile(
				combatantsFile,
				Buffer.from(JSON.stringify(this.grocheCombatants, null, 1)),
			);
		} else {
			writeCacheFile(combatantsFile, Buffer.from(""));
		}
	}
}

export const grocheGamesCore: GrocheGamesCore = new GrocheGamesCore();
