import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { queueCommand } from "../../bard";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("queue")
		.setDescription("View the queue")
		.addIntegerOption((option) => {
			return option
				.setRequired(false)
				.setName("page")
				.setDescription("Which page of the queue to show");
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		queueCommand(interaction);
	},
};
