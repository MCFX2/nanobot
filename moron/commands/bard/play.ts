import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playAudioCommand } from '../../bard';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Start playing some audio')
		.addStringOption(option => {
			return option
				.setRequired(true)
				.setName('item')
				.setDescription('a URL or song name to play');
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		playAudioCommand(interaction);
	},
};
