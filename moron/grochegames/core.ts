import { readCacheFileAsJson, writeCacheFile } from '../util';
import { AllGrocheGamesItems, InvalidItem } from './items';

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

	// if item is special (i.e. it cannot spawn randomly)
	special: boolean;

	// for items that can offer advantage/disadvantage, call these to see if buff is available. not guaranteed to be deterministic.
	givesAdvantage?: (this: GrocheGamesItem) => boolean;
	givesDisadvantage?: (this: GrocheGamesItem) => boolean;
}

export class GrocheGamesCombatant {
	team: string = '';
	// channel ID
	teamId: string = '';

	registrationComplete: boolean = false;
	// not the most elegant solution but the easiest
	backgroundMsgIds: string[] = [];

	name: string = 'unnamed';
	pronounHe: string = 'he';
	pronounHim: string = 'him';
	// empty for bots, otherwise it's the discord user ID
	id: string = '';
	picUrl: string = '';
	picDeadUrl: string = '';
	deathQuote: string = '';

	maxHP: number = 0;
	curHP: number = 0;
	baseMoney: number = 0;
	baseStrength: number = 0;
	baseSpeed: number = 0;
	baseToughness: number = 0;

	// curses
	hasShortCircuit: boolean = false;
	hasExpertMode: boolean = false;
	hasMoronicRage: boolean = false;

	// blessings
	hasInventive: boolean = false;
	hasLuck: boolean = false;
	hasDeliverance: boolean = false;

	inventory: GrocheGamesItem[] = [];

	public get strength(): number {
		let strengthMod: number = 0;
		this.inventory.forEach(item => (strengthMod += item.strBonus));
		return strengthMod + this.baseStrength;
	}

	public get speed(): number {
		let speedMod: number = 0;
		this.inventory.forEach(item => (speedMod += item.spdBonus));
		return speedMod + this.baseSpeed;
	}

	public get toughness(): number {
		let toughMod: number = 0;
		this.inventory.forEach(item => (toughMod += item.tghBonus));
		return toughMod + this.baseToughness;
	}

	public get money(): number {
		let moneyMod: number = 0;
		this.inventory.forEach(item => (moneyMod += item.mBonus));
		return moneyMod + this.baseMoney;
	}

	public get totalAdvantage(): number {
		let advantage = 1;

		if (this.hasLuck) ++advantage;

		this.inventory.forEach(item =>
			item.givesAdvantage && item.givesAdvantage() ? advantage++ : null,
		);

		return advantage;
	}

	public get totalDisadvantage(): number {
		let disadvantage = 1;

		if (this.hasLuck) ++disadvantage;

		this.inventory.forEach(item =>
			item.givesDisadvantage && item.givesDisadvantage()
				? disadvantage++
				: null,
		);

		return disadvantage;
	}
}

const combatantsFile = 'grochegames-combatants.json';
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
		this.grocheCombatants?.forEach(combatant => {
			combatant.inventory = combatant.inventory.map(
				storedItem =>
					AllGrocheGamesItems.find(
						trueItem => trueItem.name === storedItem.name,
					) ?? InvalidItem, // InvalidItem should only be possible when an item in the master list is removed or renamed mid-game
			);
		});
	}

	public set combatants(list: GrocheGamesCombatant[]) {
		this.grocheCombatants = list;

		if (this.grocheCombatants) {
			writeCacheFile(
				combatantsFile,
				Buffer.from(JSON.stringify(this.grocheCombatants, null, 1)),
			);
		} else {
			writeCacheFile(combatantsFile, Buffer.from(''));
		}
	}
}

export let grocheGamesCore: GrocheGamesCore = new GrocheGamesCore();
