import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { unFollowUserCommand } from '../../feeds/twitfollow';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unfollow')
		.setDefaultMemberPermissions('0')
		.setDescription('Unfollow a twitter account given the @handle or id')
		.addStringOption(option => {
			return option
				.setRequired(true)
				.setDescription(
					'The user to unfollow. Either paste the ID or the handle with an @ in front.',
				)
				.setName('user');
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		unFollowUserCommand(interaction);
	},
};
