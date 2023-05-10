import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playAudioCommand } from '../../bard';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Remove a song from the queue')
		.addStringOption(option => {
			return option
				.setRequired(true)
				.setName('item')
				.setDescription('The song to remove (# or URL)');
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		playAudioCommand(interaction);
	},
};
