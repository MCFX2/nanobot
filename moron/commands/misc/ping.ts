import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Ping the bot"),
	async execute(interaction: ChatInputCommandInteraction) {
		interaction.reply("you are giving me a headache");
	},
	disable: false,
};
