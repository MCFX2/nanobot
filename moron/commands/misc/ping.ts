import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Ping the bot"),
	async execute(interaction: ChatInputCommandInteraction) {
		const replies = [
			"you are giving me a headache",
			"ouch",
			"pong",
			"stop that",
			"why",
			"no",
			"GAH",
			"I WAS SLEEPING ASSHOLE",
		];
		interaction.reply(replies[Math.floor(Math.random() * replies.length)]);
	},
	disable: false,
};
