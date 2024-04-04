import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getPlayerSave } from "./mmofile";
import { ItemBuffType } from "./mmoitem";
import {
	Combat,
	FishSkill,
	ForageSkill,
	MineSkill,
	WoodChop,
} from "./mmolistskills";
import { type BaseSkill, startSkill } from "./mmoskill";

export function levelsCommand(interaction: ChatInputCommandInteraction) {
	const save = getPlayerSave(interaction.user.id);
	const preferredName =
		save.selectedTitle === ""
			? interaction.user.displayName
			: save.selectedTitle;

	const totalLevels =
		save.woodchop.level +
		save.mining.level +
		save.fishing.level +
		save.foraging.level +
		save.combat.level;
	if (totalLevels === 100) {
		const victoryImages = [
			"https://i.imgur.com/ql7zYxd.jpeg",
			"https://i.imgur.com/Ux7PvC3.png",
			"https://i.imgur.com/CTzYJJv.png",
			"https://i.imgur.com/ZRNqdTO.jpeg",
			"https://i.imgur.com/iHO71Ue.png",
			"https://i.imgur.com/ILhQxuy.gif",
			"https://i.imgur.com/yGL4RwH.png",
			"https://i.imgur.com/JuWyrBd.jpeg",
		];
		interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setImage(
						victoryImages[Math.floor(Math.random() * victoryImages.length)],
					)
					.setTitle(preferredName)
					.setDescription(
						"# You have mastered the five skills, and have earned the title of **The Ultimate Groche**! See MCFX2 for your reward.",
					),
			],
		});
		return;
	}

	interaction.reply({
		embeds: [
			new EmbedBuilder()
				.setImage(interaction.user.displayAvatarURL())
				.setTitle(preferredName)
				.setDescription(`**Wood Chopping:** ${save.woodchop.level} / 20 (${
					save.woodchop.xp
				} XP)
                Rank: ${WoodChop.getCurrentRank(save.userId)}\n
                **Mining:** ${save.mining.level} / 20 (${save.mining.xp} XP)
                Rank: ${MineSkill.getCurrentRank(save.userId)}\n
                **Fishing:** ${save.fishing.level} / 20 (${save.fishing.xp} XP)
                Rank: ${FishSkill.getCurrentRank(save.userId)}\n
                **Foraging:** ${save.foraging.level} / 20 (${save.foraging.xp} XP)
                Rank: ${ForageSkill.getCurrentRank(save.userId)}\n
                **Combat:** ${save.combat.level} / 20 (${save.combat.xp} XP)
                Rank: ${Combat.getCurrentRank(save.userId)}`),
		],
	});
}

function handleSkillCommand(
	interaction: ChatInputCommandInteraction,
	skill: BaseSkill,
) {
	const skillResult = skill.doSkill(interaction.user.id);
	if (skillResult.startType === "accepted") {
		interaction.reply(skillResult.acceptedMessage);
		startSkill(interaction, skillResult);
	} else {
		interaction.reply(skillResult.rejectionMessage);
	}
}

export function chopWoodCommand(interaction: ChatInputCommandInteraction) {
	handleSkillCommand(interaction, WoodChop);
}

export function combatCommand(interaction: ChatInputCommandInteraction) {
	handleSkillCommand(interaction, Combat);
}

export function forageCommand(interaction: ChatInputCommandInteraction) {
	handleSkillCommand(interaction, ForageSkill);
}

export function fishCommand(interaction: ChatInputCommandInteraction) {
	handleSkillCommand(interaction, FishSkill);
}

export function mineCommand(interaction: ChatInputCommandInteraction) {
	handleSkillCommand(interaction, MineSkill);
}

export function debugStatCommand(interaction: ChatInputCommandInteraction) {
	const userarg = interaction.options.getString("user");
	if (!userarg) {
		interaction.reply({ ephemeral: true, content: "You must mention a user" });
		return;
	}

	const save = getPlayerSave(userarg);

	const globalSpeed = save.inventory.reduce((acc, item) => {
		if (item.itemEffect === ItemBuffType.EverythingFaster) {
			return acc + item.power;
		}
		return acc;
	}, 0);

	const globalPower = save.inventory.reduce((acc, item) => {
		if (item.itemEffect === ItemBuffType.EverythingBetter) {
			return acc + item.power;
		}
		return acc;
	}, 0);

	interaction.reply({
		embeds: [
			new EmbedBuilder()
				.setTitle("debug stats")
				.setDescription(`**Wood Chopping:** ${save.woodchop.level} / 20 (${
					save.woodchop.xp
				} XP)
                Rank: ${WoodChop.getCurrentRank(save.userId)}
                Speed: ${save.inventory.reduce((acc, item) => {
									if (item.itemEffect === ItemBuffType.WoodchopFaster) {
										return acc + item.power;
									}
									return acc;
								}, globalSpeed)}
                Power: +${save.inventory.reduce((acc, item) => {
									if (item.itemEffect === ItemBuffType.WoodchopBetter) {
										return acc + item.power;
									}
									return acc;
								}, globalPower)}
                \n
                **Mining:** ${save.mining.level} / 20 (${save.mining.xp} XP)
                Rank: ${MineSkill.getCurrentRank(save.userId)}
                Speed: ${save.inventory.reduce((acc, item) => {
									if (item.itemEffect === ItemBuffType.MiningFaster) {
										return acc + item.power;
									}
									return acc;
								}, globalSpeed)}
                    Power: +${save.inventory.reduce((acc, item) => {
											if (item.itemEffect === ItemBuffType.WoodchopBetter) {
												return acc + item.power;
											}
											return acc;
										}, globalPower)}
                \n
                **Fishing:** ${save.fishing.level} / 20 (${save.fishing.xp} XP)
                Rank: ${FishSkill.getCurrentRank(save.userId)}
                Speed: ${save.inventory.reduce((acc, item) => {
									if (item.itemEffect === ItemBuffType.FishingFaster) {
										return acc + item.power;
									}
									return acc;
								}, globalSpeed)}
                    Power: +${save.inventory.reduce((acc, item) => {
											if (item.itemEffect === ItemBuffType.WoodchopBetter) {
												return acc + item.power;
											}
											return acc;
										}, globalPower)}
                \n
                **Foraging:** ${save.foraging.level} / 20 (${save.foraging.xp} XP)
                Rank: ${ForageSkill.getCurrentRank(save.userId)}
                Speed: ${save.inventory.reduce((acc, item) => {
									if (item.itemEffect === ItemBuffType.ForagingFaster) {
										return acc + item.power;
									}
									return acc;
								}, globalSpeed)}
                    Power: +${save.inventory.reduce((acc, item) => {
											if (item.itemEffect === ItemBuffType.WoodchopBetter) {
												return acc + item.power;
											}
											return acc;
										}, globalPower)}
                \n
                **Combat:** ${save.combat.level} / 20 (${save.combat.xp} XP)
                Rank: ${Combat.getCurrentRank(save.userId)}
                Speed: ${save.inventory.reduce((acc, item) => {
									if (item.itemEffect === ItemBuffType.CombatFaster) {
										return acc + item.power;
									}
									return acc;
								}, globalSpeed)}
                    Power: +${save.inventory.reduce((acc, item) => {
											if (item.itemEffect === ItemBuffType.WoodchopBetter) {
												return acc + item.power;
											}
											return acc;
										}, globalPower)}
                \n
                Luck: ${save.inventory.reduce((acc, item) => {
									if (item.itemEffect === ItemBuffType.Lucky) {
										return acc + item.power;
									}
									return acc;
								}, 0)}
                Items In Inventory: ${save.inventory.length}`),
		],
	});
}
