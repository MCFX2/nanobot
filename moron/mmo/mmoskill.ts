import type { ChatInputCommandInteraction } from "discord.js";
import { WarningLevel } from "../logger";
import { mmoLogger } from "./mmo";
import {
	type MMOSaveFile,
	type MMOSkillSave,
	commitSaveData,
	getPlayerSave,
} from "./mmofile";
import { ItemBuffType, generateDescription, generateDrop } from "./mmoitem";

export type SkillStarter = SkillSuccessStarter | SkillRejectedStarter;

export type SkillSuccessStarter = {
	startType: "accepted";
	timeSeconds: number;
	onCompleteMessage: string;
	onComplete: () => void;
	acceptedMessage: string;
};

export type SkillRejectedStarter = {
	startType: "rejected";
	rejectionMessage: string;
};

export function startSkill(
	prompt: ChatInputCommandInteraction,
	starter: SkillSuccessStarter,
) {
	setTimeout(() => {
		const channel = prompt.channel;
		if (!channel || channel.isDMBased()) {
			mmoLogger.log(
				"Invalid channel when trying to notify skill completion",
				WarningLevel.Error,
			);
			return;
		}

		starter.onComplete();
		channel.send({
			content: `<@${prompt.user.id}> ${starter.onCompleteMessage}`,
		});
	}, starter.timeSeconds * 1000);
}

export class BaseSkill {
	private readonly baseXp = 100;
	private readonly xpScaleRate = 2.2;
	private readonly xpGainRate = 2;
	private readonly xpVariance = 0.5;

	protected skillMaxedMessage =
		"You are already a master woodchopper! There's nothing more to learn. Retire and enjoy your golden years. Or try one of the other skills.";
	protected BetterBuff = ItemBuffType.CombatBetter;
	protected FasterBuff = ItemBuffType.CombatFaster;
	protected ranks: string[] = [];
	protected beginPrompt = "";
	protected levelUpPrompt = "";
	protected finishPrompt = "";
	protected baseTime = 300;

	private currentlyDoing: string[] = [];

	public getCurrentRank(user: string): string {
		const save = getPlayerSave(user);
		return this.ranks[this.getRelevantSkillSave(save).level - 1];
	}

	protected getRelevantSkillSave(userSave: MMOSaveFile): MMOSkillSave {
		return userSave.combat;
	}

	public doSkill(userId: string): SkillStarter {
		if (this.currentlyDoing.includes(userId)) {
			return {
				startType: "rejected",
				rejectionMessage: "You are already doing this.",
			};
		}

		const save = getPlayerSave(userId);
		const skillSave = this.getRelevantSkillSave(save);
		if (skillSave.level >= 20) {
			return {
				startType: "rejected",
				rejectionMessage: this.skillMaxedMessage,
			};
		}

		this.currentlyDoing.push(userId);

		const xpToNextLevel =
			this.baseXp * this.xpScaleRate ** (skillSave.level - 1);

		const bonusLevels = save.inventory.reduce((acc, item) => {
			if (
				item.itemEffect === this.BetterBuff ||
				item.itemEffect === ItemBuffType.EverythingBetter
			) {
				return acc + item.power;
			}
			return acc;
		}, 0);
		const adjustedBaseXp =
			this.baseXp *
			(this.xpGainRate + 0.03 * bonusLevels) ** (skillSave.level - 1);
		const awardedXp = Math.round(
			adjustedBaseXp +
				(Math.random() - 0.5) * (this.xpVariance * adjustedBaseXp),
		);

		const newXp = skillSave.xp + awardedXp;

		const luckBoost = save.inventory.reduce((acc, item) => {
			if (item.itemEffect === ItemBuffType.Lucky) {
				return acc + item.power;
			}
			return acc;
		}, 0);
		const luck = Math.floor(Math.random() * 50) + luckBoost;

		const loot = generateDrop(luck);

		const speed = save.inventory.reduce((acc, item) => {
			if (
				item.itemEffect === this.FasterBuff ||
				item.itemEffect === ItemBuffType.EverythingFaster
			) {
				return acc + item.power;
			}
			return acc;
		}, 0);

		const rate = 2 ** speed;

		const message = `${this.beginPrompt} This will take about ${Math.round(
			this.baseTime / rate,
		)} seconds.${
			luck > 45
				? " You feel especially lucky, for some reason."
				: luck < 5
					? " You feel like you're going to have a bad time."
					: ""
		}`;
		const levelUpMessage = `${this.levelUpPrompt} You are now level ${
			skillSave.level + 1
		} and your new title is **${this.ranks[skillSave.level]}**.`;

		let lootMessage = "";
		if (loot) {
			if (loot.type === "event") {
				lootMessage = `\n${loot.impactText}`;
			} else {
				lootMessage = `\nCool! You got a **${
					loot.displayName
				}**!!! [${generateDescription(loot)}]`;
			}
		}

		return {
			startType: "accepted",
			acceptedMessage: message,
			onCompleteMessage: `${this.finishPrompt} (+${awardedXp} XP)${
				newXp >= xpToNextLevel ? `\n${levelUpMessage}` : ""
			}${lootMessage}`,
			onComplete: () => {
				const save = getPlayerSave(userId);
				const skillSave = this.getRelevantSkillSave(save);
				skillSave.xp = newXp;
				if (newXp >= xpToNextLevel) {
					save.earnedTitles.push(this.ranks[skillSave.level]);
					skillSave.level++;
					skillSave.xp -= xpToNextLevel;
				}
				if (loot) {
					if (loot.type === "item") {
						save.inventory.push(loot);
					} else {
						loot.doEffect(userId);
					}
				}
				commitSaveData();
				this.currentlyDoing.splice(this.currentlyDoing.indexOf(userId), 1);
			},
			timeSeconds: Math.round(this.baseTime / rate),
		};
	}
}
