import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { skipCommand } from "../../bard";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("skip")
		.setDescription("Skip the current song"),
	async execute(interaction: ChatInputCommandInteraction) {
		skipCommand(interaction);
	},
	disable: false,
};
