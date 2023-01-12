import {
	ActionRowBuilder,
	ChatInputCommandInteraction,
	Client,
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
		logger.log(interaction.customId);
		// filter to our module
		if (interaction.customId.startsWith('grochegames-')) {
			const filteredId = interaction.customId.substring(
				'grochegames-'.length,
				interaction.customId.length,
			);
			if (filteredId.startsWith('wizard')) {
				if (filteredId.endsWith('-npc')) {
					setNpcRegistration(interaction);
				}
				setPlayerRegistration(interaction);

				// todo: set up part 2 of registration
			}
			return true;
		}
		return false;
	}
	return false;
}

function setPlayerRegistration(interaction: ModalSubmitInteraction) {}

function setNpcRegistration(interaction: ModalSubmitInteraction) {
	const npcName = interaction.fields.getTextInputValue('npcname');
	const npcHePronoun = interaction.fields
		.getTextInputValue('npcpronounhe')
		.toLowerCase();
	const npcHimPronoun = interaction.fields
		.getTextInputValue('npcpronounhim')
		.toLowerCase();

	const npcDeathQuote = interaction.fields.getTextInputValue('npcdeathquote');

	const user = interaction.user;

	// todo: store this info
}

export function registerTeamCommand(interaction: ChatInputCommandInteraction) {
	logger.log('registering user in channel ' + interaction.channelId);

	// todo: determine whether user is registering NPC + themselves or just themselves

	const hasNPCAlly = true;

	const wizard = new ModalBuilder()
		.setCustomId('grochegames-wizard' + (hasNPCAlly ? '-npc' : ''))
		.setTitle('Team Registration Form');

	let wizardItems: ActionRowBuilder<TextInputBuilder>[] = [];

	if (hasNPCAlly) {
		wizardItems.push(
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId('npcname')
					.setLabel('Name of your NPC ally')
					.setRequired(true)
					.setStyle(TextInputStyle.Short),
			),
		);
		wizardItems.push(
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId('npcpronounhe')
					.setLabel('First pronoun of your NPC ally')
					.setValue('he')
					.setRequired(true)
					.setStyle(TextInputStyle.Short),
			),
		);
		wizardItems.push(
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId('npcpronounhim')
					.setLabel('Second pronoun of your NPC ally')
					.setValue('him')
					.setRequired(true)
					.setStyle(TextInputStyle.Short),
			),
		);
		wizardItems.push(
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId('npcdeathquote')
					.setLabel('Dying quote')
					.setRequired(false)
					.setMaxLength(500)
					.setStyle(TextInputStyle.Paragraph),
			),
		);
	}

	wizard.setComponents(wizardItems);

	interaction.showModal(wizard);
}
