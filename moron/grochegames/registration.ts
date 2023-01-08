import {
	ActionRowBuilder,
	ChatInputCommandInteraction,
	Client,
	ComponentBuilder,
	Interaction,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { Logger, WarningLevel } from '../logger';
import { MoronModule } from '../moronmodule';

let client: Client;

const logger: Logger = new Logger(
	'grochegames/registration',
	WarningLevel.Notice,
);

export const GrocheGamesRegistration: MoronModule = {
	name: 'grochegames/registration',
	onInit: onInit,
	onInteract: onInteract,
};

async function onInit(discordClient: Client) {
	client = discordClient;
	logger.log('initialized');
}

function onInteract(interaction: Interaction): boolean {
	// filter by interaction type
	if (interaction.isModalSubmit()) {
		// filter to our module
		if (interaction.customId.startsWith('grochegames-')) {
			const filteredId = interaction.customId.substring(
				'grochegames-'.length,
				interaction.customId.length,
			);
			if (filteredId.startsWith('npcwizard')) {
				setNpcRegistration(interaction);
			}
			return true;
		}
		return false;
	}
	return false;
}

function setNpcRegistration(interaction: ModalSubmitInteraction) {
	const npcName = interaction.fields.getTextInputValue('npcname');
	const npcHePronoun = interaction.fields
		.getTextInputValue('npcpronounhe')
		.toLowerCase();
	const npcHimPronoun = interaction.fields
		.getTextInputValue('npcpronounhim')
		.toLowerCase();

	interaction.reply({
		content:
			'omg i love ' +
			npcName +
			' so much i wish ' +
			npcHePronoun +
			' would step on me while laughing to ' +
			npcHimPronoun +
			'self uwu',
	});
}

export function registerTeamCommand(interaction: ChatInputCommandInteraction) {
	logger.log('registering user in channel ' + interaction.channelId);

	const wizard = new ModalBuilder()
		.setCustomId('grochegames-npcwizard')
		.setTitle('Team Registration Form');

	const npcNameInput = new TextInputBuilder()
		.setCustomId('npcname')
		.setLabel('Name of your NPC ally')
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const npcHePronoun = new TextInputBuilder()
		.setCustomId('npcpronounhe')
		.setLabel('First pronoun of your NPC ally')
		.setValue('he')
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const npcHimPronoun = new TextInputBuilder()
		.setCustomId('npcpronounhim')
		.setLabel('Second pronoun of your NPC ally')
		.setValue('him')
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
		npcNameInput,
	);
	const secondActionRow =
		new ActionRowBuilder<TextInputBuilder>().addComponents(npcHePronoun);
	const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
		npcHimPronoun,
	);

	wizard.setComponents(firstActionRow, secondActionRow, thirdActionRow);

	interaction.showModal(wizard);
}
