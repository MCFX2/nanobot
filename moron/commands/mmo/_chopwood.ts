import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { chopWoodCommand } from "../../mmo/mmocmds";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("chopwood")
		.setDescription("Chop some wood"),
	async execute(interaction: ChatInputCommandInteraction) {
		chopWoodCommand(interaction);
	},
};
