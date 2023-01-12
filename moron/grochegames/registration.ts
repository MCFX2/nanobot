import {
	ActionRowBuilder,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Interaction,
	Message,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { Logger, WarningLevel } from '../logger';
import { MoronModule } from '../moronmodule';
import { GrocheGamesCombatant, grocheGamesCore } from './core';

let client: Client;

const logger: Logger = new Logger(
	'grochegames/registration',
	WarningLevel.Notice,
);

export const GrocheGamesRegistration: MoronModule = {
	name: 'grochegames/registration',
	onInit: onInit,
	onInteract: onInteract,
	onMessageSend: onMessageSend,
};

async function onInit(discordClient: Client) {
	client = discordClient;
	logger.log('initialized');
}

function getImageAttachment(message: Message): string {
	if (message.attachments.size < 1) {
		message.reply(
			"Sorry, you must attach an image directly. Links won't work.",
		);
		return '';
	} else if (message.attachments.size > 1) {
		message.reply('Sorry, you must send exactly one image.');
		return '';
	}

	const attachUrl = message.attachments.first()!.url;
	if (!attachUrl.endsWith('.jpg') && !attachUrl.endsWith('.png')) {
		message.reply(
			"Sorry, I don't recognize that kind of file. It has to be a PNG or JPG image.",
		);
		return '';
	}
	return attachUrl;
}

interface GrocheGamesBackground {
	name: string;
	desc: string;
	buff?: string;
	buffDesc?: string;
	curse?: string;
	curseDesc?: string;

	hp: number;
	money: number;
	strength: number;
	speed: number;
	toughness: number;
}

const backgrounds: GrocheGamesBackground[] = [
	{
		name: 'Miner',
		desc: "You used to spend all day hauling coal and other metals out of the mines. You're incredibly tough, but the occupational hazard has left you damaged and poor.",

		hp: 3,
		money: 1,
		strength: 5,
		speed: 2,
		toughness: 4,
	},
	{
		name: 'Highschool Track Star',
		desc: 'Growing up in a wealthy family, all you ever needed to worry about was winning at the next meet.',

		hp: 3,
		money: 3,
		strength: 3,
		speed: 4,
		toughness: 2,
	},
	{
		name: 'Labrat',
		desc: "You were subject to numerous government experiments. You've gained some incredible physical abilities, but the experiments took as much as they gave",

		hp: 7,
		money: 0,
		strength: 1,
		speed: 3,
		toughness: 5,
	},
	{
		name: 'Mailman',
		desc: "You used to move packages for a living. Now you're hoping for an expedited victory.",

		buff: 'Deliverance',
		buffDesc: 'Start the game with a completely random item.',

		hp: 4,
		money: 1,
		strength: 4,
		speed: 3,
		toughness: 1,
	},
	{
		name: 'Unfortunate Toddler',
		desc: 'What are you doing in the hunger games??? Get this kid out of here! Might not actually be a toddler but sure looks like one.',

		buff: "Can't show that on TV",
		buffDesc:
			'Do EVERYTHING with advantage (all RNG effects happen an extra time and take the best result).',

		hp: 3,
		money: 4,
		strength: 1,
		speed: 2,
		toughness: 1,
	},
	{
		name: 'Bear Grylls Apostle',
		desc: 'You have turned survivalism into a religion. Your Australian accent could use some work though.',

		buff: 'Multitool',
		buffDesc: 'Receive no passive stat penalties from items.',

		hp: 5,
		money: 0,
		strength: 3,
		speed: 1,
		toughness: 4,
	},
	{
		name: 'Glitchy Supersoldier',
		desc: "You're an elite master of everything, but there seem to have been some issues in your software...",

		curse: 'Short-circuit',
		curseDesc: 'Occasionally lose stats, permanently.',

		hp: 4,
		money: 1,
		strength: 4,
		speed: 4,
		toughness: 4,
	},
	{
		name: 'God Gamer',
		desc: "You're as strong as it gets, but you prefer life on its hardest difficulty.",

		curse: 'Life on Expert Mode',
		curseDesc:
			'Do EVERYTHING with disadvantage (all RNG effects happen an extra time and take the worst result).',

		hp: 7,
		money: 0,
		strength: 5,
		speed: 5,
		toughness: 5,
	},
	{
		name: 'Buffoon',
		desc: "Nobody knows how you survived this long. You're remarkably stupid, but very physically able.",

		curse: 'Moronic Abuse',
		curseDesc: 'Receive double passive stat penalties from items.',

		hp: 6,
		money: 1,
		strength: 5,
		speed: 2,
		toughness: 3,
	},
];

async function onMessageSend(message: Message) {
	// determine whether user has a bot ally with missing profile pic
	const channelId = message.channelId;

	const combatants = grocheGamesCore.combatants;

	const botAlly = combatants.findIndex(
		fighter => fighter.teamId === channelId && fighter.isBot,
	);

	if (botAlly !== -1) {
		if (combatants[botAlly].picUrl === '') {
			// if we are here, we are currently prompting user for profile pic (bot user exists but no pfp set)

			// check for attachments
			const attachUrl = getImageAttachment(message);
			if (attachUrl !== '') {
				combatants[botAlly].picUrl = attachUrl;
				grocheGamesCore.combatants = combatants;
				await message.reply({
					content:
						"I've successfully set your ally's image to this. If it looks wrong, ping MCFX2 to have him try to fix it. Do not delete the message you sent containing the image.",
					embeds: [new EmbedBuilder().setImage(attachUrl)],
				});
				message.reply({
					content:
						"Next, please upload a **dead version**. I know I said this was optional earlier, but I lied. Reuse the same image from before if you're lazy.",
				});
			}
		} else if (combatants[botAlly].picDeadUrl === '') {
			// prompting user for dead profile pic
			const attachUrl = getImageAttachment(message);
			if (attachUrl !== '') {
				combatants[botAlly].picDeadUrl = attachUrl;
				grocheGamesCore.combatants = combatants;
				await message.reply({
					content:
						"I've successfully set your ally's image to this. If it looks wrong, ping MCFX2 to have him try to fix it. Do not delete the message you sent containing the image.",
					embeds: [new EmbedBuilder().setImage(attachUrl)],
				});
				message.reply({
					content:
						"You're almost done! Please pick a background for " +
						combatants[botAlly].name +
						'.\n\nThe available backgrounds are as follows:\nMiner: You used to spend all day hauling coal and other metals out of the mines.' +
						"You're incredibly tough, but the occupational hazard has left you damaged and poor.\nHP: 3, Money: +1, Strength: +5, Speed: +2, Toughness: +4",
				});
			}
		}
	}

	//
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
				"You've successfully registered an NPC ally. Next, **please upload a photo you would like to use for the bot.** It must be uploaded to this channel, it cannot be a link.\n\nYou just registered **" +
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
