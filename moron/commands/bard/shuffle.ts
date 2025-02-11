import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { shuffleCommand } from "../../bard";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("shuffle")
		.setDescription("Toggle shuffle mode (plays songs in random order)"),
	async execute(interaction: ChatInputCommandInteraction) {
		shuffleCommand(interaction);
	},
	disable: false,
};
