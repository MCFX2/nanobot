import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { registerNewReaction } from "../../reactor";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("addreact")
		.setDefaultMemberPermissions("0")
		.setDescription("Teach the bot a new reaction trigger")
		.addStringOption((option) => {
			return option
				.setRequired(true)
				.setDescription("The emote to react with.")
				.setName("react");
		})
		.addStringOption((option) => {
			return option
				.setName("text")
				.setDescription(
					"The text that needs to match the message to trigger the emote.",
				)
				.setRequired(true);
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
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		registerNewReaction(interaction);
	},
};
