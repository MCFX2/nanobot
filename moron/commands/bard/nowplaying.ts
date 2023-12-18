import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { nowPlayingCommand } from '../../bard';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('nowplaying')
		.setDescription('View the currently playing song'),
	async execute(interaction: ChatInputCommandInteraction) {
		nowPlayingCommand(interaction);
	},
};
