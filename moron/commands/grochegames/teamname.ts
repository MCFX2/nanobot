import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { teamNameCommand } from '../../grochegames/registration';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('teamname')
		.setDefaultMemberPermissions('0')
		.setDescription('Set the team name for your team.')
		.addStringOption(arg =>
			arg
				.setName('name')
				.setRequired(true)
				.setMaxLength(12)
				.setDescription('The team name to use.'),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		teamNameCommand(interaction);
	},
};
