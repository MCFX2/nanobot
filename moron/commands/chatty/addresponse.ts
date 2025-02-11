import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { registerSimpleChatTrigger } from "../../chatty";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("addresponse")
		.setDefaultMemberPermissions("0")
		.setDescription("Teach the bot a new thing to say")
		.addStringOption((option) => {
			return option
				.setRequired(true)
				.setDescription(
					"A comma-separated list of strings that will trigger the response.",
				)
				.setName("triggers");
		})
		.addStringOption((option) => {
			return option
				.setRequired(true)
				.setDescription("A comma-separated list of possible responses.")
				.setName("responses");
		})
		.addBooleanOption((option) => {
			return option
				.setName("ignore_punctuation")
				.setDescription("(true by default)")
				.setRequired(false);
		})
		.addBooleanOption((option) => {
			return option
				.setName("ignore_capitalization")
				.setDescription("(true by default)")
				.setRequired(false);
		})
		.addStringOption((option) => {
			return option
				.setName("append")
				.setDescription(
					"to change an existing response, pass a string here that triggers a response.",
				)
				.setRequired(false);
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		registerSimpleChatTrigger(interaction);
	},
	disable: true,
};
