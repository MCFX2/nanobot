import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { followUserCommand } from '../../feeds/twitfollow';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('follow')
		.setDefaultMemberPermissions('0')
		.setDescription('Follow a twitter account given the @handle or id')
		.addStringOption(option => {
			return option
				.setRequired(true)
				.setDescription(
					'The user to follow. Either paste the ID or the handle with an @ in front.',
				)
				.setName('user');
		})
		.addChannelOption(option => {
			return option
				.setName('target_channel')
				.setDescription(
					'The channel that followed tweets will ultimately be posted to.',
				)
				.setRequired(true);
		})
		.addChannelOption(option => {
			return option
				.setName('vetting_channel')
				.setDescription(
					'The channel that tweets will be posted to for vetting before going to the target channel',
				)
				.setRequired(false);
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		followUserCommand(interaction);
	},
};
