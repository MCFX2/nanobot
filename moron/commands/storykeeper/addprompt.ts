import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { storykeeper_addPrompt } from '../../storykeeper';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addprompt')
		.setDescription('Add a new writing prompt to storykeeper.')
		.addStringOption(option => {
			return option
				.setName('prompt')
				.setDescription('The new prompt.')
				.setRequired(true);
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		storykeeper_addPrompt(interaction);
	},
};
