import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("inventory")
		.setDescription("Check your inventory"),
	async execute(interaction: ChatInputCommandInteraction) {},
	disable: false,
};
