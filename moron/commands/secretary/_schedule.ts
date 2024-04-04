import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { setSchedule } from "../../secretary";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("setschedule")
		.setDescription("Define your schedule")
		.addStringOption((option) => {
			return option
				.setName("schdulestring")
				.setRequired(true)
				.setDescription(
					"Your schedule. Format: day:priority:[start]-[end][+reason],...",
				);
		})
		.addBooleanOption((option) => {
			return option
				.setName("append")
				.setDescription(
					"If true, add the defined schedule to your existing schedule. If false, overwrite it.",
				)
				.setRequired(true);
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		setSchedule(interaction);
	},
};
