import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { forageCommand } from "../../mmo/mmocmds";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("forage")
		.setDescription("Go foraging"),
	async execute(interaction: ChatInputCommandInteraction) {
		forageCommand(interaction);
	},
	disable: false,
};
