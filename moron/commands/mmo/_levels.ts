import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { levelsCommand } from "../../mmo/mmocmds";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("levels")
		.setDescription("See your levels and XP"),
	async execute(interaction: ChatInputCommandInteraction) {
		levelsCommand(interaction);
	},
	disable: false,
};
