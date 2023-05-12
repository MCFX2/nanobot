import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playlistCommand } from '../../bard';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('playlist')
		.setDescription('Play a playlist of songs')
		.addStringOption(option => {
			return option
				.setRequired(true)
				.setName('item')
				.setDescription('a URL including a playlist to play');
		})
		.addBooleanOption(option => {
			return option
				.setRequired(false)
				.setName('shuffle')
				.setDescription('shuffle the playlist into the queue');
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		playlistCommand(interaction);
	},
};
