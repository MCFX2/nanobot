import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { mineCommand } from "../../mmo/mmocmds";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("mine")
		.setDescription("Go out mining"),
	async execute(interaction: ChatInputCommandInteraction) {
		mineCommand(interaction);
	},
};
