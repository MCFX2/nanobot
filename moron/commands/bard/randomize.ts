import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { randomizeCommand } from '../../bard';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('randomize')
		.setDescription('Randomize the order of songs in queue (cannot be undone)'),
	async execute(interaction: ChatInputCommandInteraction) {
		randomizeCommand(interaction);
	},
};
