import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { removeCommand } from "../../bard";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("remove")
		.setDescription("Remove a song from the queue")
		.addStringOption((option) => {
			return option
				.setRequired(true)
				.setName("item")
				.setDescription("The song to remove (# in queue)");
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		removeCommand(interaction);
	},
};
