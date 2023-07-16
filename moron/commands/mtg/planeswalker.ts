import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { planeswalkerAbility } from '../../mtg';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('planeswalker')
		.setDescription('Activate one of Gaming Moron\'s planeswalker abilities.')
		.addStringOption(option => {
			return option
				.setName('effect')
				.setDescription(
					'Which effect to use. Options are +2, +6, -2, and -10.',
				)
				.setRequired(true);
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		planeswalkerAbility(interaction);
	},
};
