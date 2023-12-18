import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { registerTeamCommand } from '../../grochegames/registration';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDefaultMemberPermissions('0')
		.setDescription(
			'Start the registration process for your team. WARNING: You can only do this once!',
		),
	async execute(interaction: ChatInputCommandInteraction) {
		registerTeamCommand(interaction);
	},
};
