import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { fishCommand } from "../../mmo/mmocmds";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("fish")
		.setDescription("Fish around for some fish"),
	async execute(interaction: ChatInputCommandInteraction) {
		fishCommand(interaction);
	},
	disable: false,
};
