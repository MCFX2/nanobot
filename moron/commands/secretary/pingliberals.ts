import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { pingLiberals, whoCanMakeIt } from '../../secretary';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pingliberals')
		.setDescription('Pings everyone who can make it to a given event (use wisely)')
		.addStringOption(option => {
			return option
				.setName('time')
				.setRequired(true)
				.setDescription(
					'When the event is. Format: [day:]start[-end]',
				);
		})
		.addIntegerOption(option => {
			return option
				.setName('priority')
				.setDescription('How important this event is')
				.setRequired(false)
				.setChoices()
				.addChoices({ name: 'uwu if its not too much twoubwe...', value: 0 })
				.addChoices({ name: 'da boyss', value: 1 })
				.addChoices({ name: 'business lunch', value: 2 })
				.addChoices({ name: 'this better be good', value: 3 })
				.addChoices({ name: 'kinda clingy at this point ngl', value: 4 })
				.addChoices({ name: 'LIFE OR DEATH SCENARIO (PINGS EVERYONE!!!)', value: 5 });
		})
		.addStringOption(option => {
			return option
				.setName('message')
				.setDescription('the message you want to include with the ping')
				.setRequired(false)
				.setMinLength(1)
				.setMaxLength(512)
	}),
	async execute(interaction: ChatInputCommandInteraction) {
		pingLiberals(interaction);
	},
};
