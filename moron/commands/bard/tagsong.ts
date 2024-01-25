import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { tagCommand } from "../../bard";

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tagsong')
		.setDescription('Give the current song a tag. Tags are used to find songs later.')
		.addStringOption(option => {
			return option
				.setRequired(true)
				.setName('tag')
				.setDescription('The tag to give the song');
				}),
	async execute(interaction: ChatInputCommandInteraction) {
		tagCommand(interaction);
	},
};
