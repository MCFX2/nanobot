import { readCacheFileAsJson, writeCacheFileAsJson } from "../util";
import type { MMOItem } from "./mmoitem";

export interface MMOSkillSave {
	level: number;
	xp: number;
}

export interface MMOSaveFile {
	userId: string;

	woodchop: MMOSkillSave;
	mining: MMOSkillSave;
	fishing: MMOSkillSave;
	foraging: MMOSkillSave;
	combat: MMOSkillSave;

	inventory: MMOItem[];
	earnedTitles: string[];
	selectedTitle: string;
}

interface MMOData {
	[userId: string]: MMOSaveFile;
}

let activeData: MMOData = {};

export function init_mmofile() {
	const saveData = readCacheFileAsJson("mmo.json");
	if (saveData) {
		activeData = saveData;
	}
}

export function getPlayerSave(userId: string): MMOSaveFile {
	if (activeData[userId]) {
		return activeData[userId];
	}
	const newSave = generateDefaultSave(userId);
	activeData[userId] = newSave;
	commitSaveData();
	return newSave;
}

function generateDefaultSave(userId: string): MMOSaveFile {
	return {
		userId: userId,

		woodchop: {
			level: 1,
			xp: 0,
		},
		mining: {
			level: 1,
			xp: 0,
		},
		fishing: {
			level: 1,
			xp: 0,
		},
		foraging: {
			level: 1,
			xp: 0,
		},
		combat: {
			level: 1,
			xp: 0,
		},
		inventory: [],
		earnedTitles: [],
		selectedTitle: "",
	};
}

export function commitSaveData() {
	writeCacheFileAsJson("mmo.json", activeData);
}
