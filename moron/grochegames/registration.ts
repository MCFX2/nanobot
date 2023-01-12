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
import { GrocheGamesCombatant, grocheGamesCore } from './core';
import { AllGrocheGamesItems } from './items';

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
					setBaseRegistration(interaction, true);
				} else {
					setBaseRegistration(interaction, false);
				}

				// todo: set up part 2 of registration
			}
			return true;
		}
		return false;
	}
	return false;
}

function setBaseRegistration(
	interaction: ModalSubmitInteraction,
	includeNPC: boolean,
) {
	let combatants = grocheGamesCore.combatants;

	if (includeNPC) {
		const npcName = interaction.fields.getTextInputValue('npcname');
		const npcHePronoun = interaction.fields
			.getTextInputValue('npcpronounhe')
			.toLowerCase();
		const npcHimPronoun = interaction.fields
			.getTextInputValue('npcpronounhim')
			.toLowerCase();

		const npcDeathQuote = interaction.fields.getTextInputValue('npcdeathquote');

		let npcFighter = new GrocheGamesCombatant();

		npcFighter.name = npcName;
		npcFighter.pronounHe = npcHePronoun;
		npcFighter.pronounHim = npcHimPronoun;
		npcFighter.deathQuote = npcDeathQuote;
		npcFighter.teamId = interaction.channelId ?? '';
		npcFighter.isBot = true;

		combatants.push(npcFighter);

		// end interaction chain by prompting user to /register again, to set up their own character

		interaction.reply({
			content:
				"You've successfully registered an NPC ally. Please run /register again to set up yourself.\n\nYou just registered **" +
				npcName +
				'**. ' +
				npcHePronoun +
				' is an NPC ally of yours, and will utter the following phrase when ' +
				npcHePronoun +
				' finds ' +
				npcHimPronoun +
				'self dead:\n\n' +
				npcDeathQuote +
				'\n\nIf any of this looks wrong, ping MCFX2 so he can manually fix it.',
		});
	} else {
		const name = interaction.fields.getTextInputValue('name');
		const hePronoun = interaction.fields
			.getTextInputValue('pronounhe')
			.toLowerCase();
		const himPronoun = interaction.fields
			.getTextInputValue('pronounhim')
			.toLowerCase();

		const deathQuote = interaction.fields.getTextInputValue('deathquote');

		let fighter = new GrocheGamesCombatant();

		fighter.name = name;
		fighter.pronounHe = hePronoun;
		fighter.pronounHim = himPronoun;
		fighter.deathQuote = deathQuote;
		fighter.teamId = interaction.channelId ?? '';
		fighter.isBot = true;

		combatants.push(fighter);
	}

	grocheGamesCore.combatants = combatants;
}

function playerRegistryModal(interaction: ChatInputCommandInteraction) {
	const wizard = new ModalBuilder()
		.setCustomId('grochegames-wizard')
		.setTitle('Player Registration Form');

	let wizardItems: ActionRowBuilder<TextInputBuilder>[] = [];

	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('name')
				.setMaxLength(24)
				.setMinLength(2)
				.setLabel('Your name')
				.setRequired(true)
				.setValue(interaction.user.username)
				.setPlaceholder('The Rulesmeister')
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('pronounhe')
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel('Your first pronoun')
				.setValue('he')
				.setRequired(true)
				.setPlaceholder('he/she/they/it')
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('pronounhim')
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel('Your second pronoun')
				.setValue('him')
				.setPlaceholder('him/her/them/it')
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('deathquote')
				.setLabel('Your dying quote')
				.setPlaceholder("Yeah, this one's going in my cringe compilation.")
				.setRequired(false)
				.setMaxLength(500)
				.setStyle(TextInputStyle.Paragraph),
		),
	);

	wizard.setComponents(wizardItems);
	interaction.showModal(wizard);
}

function npcRegistryModal(interaction: ChatInputCommandInteraction) {
	const wizard = new ModalBuilder()
		.setCustomId('grochegames-wizard-npc')
		.setTitle('NPC Ally Registration Form');

	let wizardItems: ActionRowBuilder<TextInputBuilder>[] = [];

	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('npcname')
				.setMaxLength(24)
				.setMinLength(2)
				.setLabel('Name of your NPC ally')
				.setPlaceholder('Bobert the Buildert')
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('npcpronounhe')
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel('First pronoun of your NPC ally')
				.setValue('he')
				.setPlaceholder('he/she/they/it')
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('npcpronounhim')
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel('Second pronoun of your NPC ally')
				.setValue('him')
				.setPlaceholder('him/her/them/it')
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('npcdeathquote')
				.setLabel('Dying quote')
				.setPlaceholder('i am slain. how could this happen. explain.')
				.setRequired(false)
				.setMaxLength(500)
				.setStyle(TextInputStyle.Paragraph),
		),
	);

	wizard.setComponents(wizardItems);
	interaction.showModal(wizard);
}

export function registerTeamCommand(interaction: ChatInputCommandInteraction) {
	logger.log('registering user in channel ' + interaction.channelId);

	// todo: determine whether user is registering NPC + themselves or just themselves

	// true when either:
	// - user has already registered an NPC on their team
	// - user is on an auto-NPC registered team
	const hasNPCAlly = true;

	if (hasNPCAlly) {
		npcRegistryModal(interaction);
	} else {
		playerRegistryModal(interaction);
	}
}
