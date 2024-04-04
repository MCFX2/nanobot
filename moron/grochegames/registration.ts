import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	type Interaction,
	type Message,
	ModalBuilder,
	type ModalSubmitInteraction,
	type TextChannel,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Logger, WarningLevel } from "../logger";
import type { MoronModule } from "../moronmodule";
import { GrocheGamesCombatant, grocheGamesCore } from "./core";

let client: Client;

const logger: Logger = new Logger(
	"grochegames/registration",
	WarningLevel.Notice,
);

export const GrocheGamesRegistration: MoronModule = {
	name: "grochegames/registration",
	onInit: onInit,
	onInteract: onInteract,
	onMessageSend: onMessageSend,
};

async function onInit(discordClient: Client) {
	client = discordClient;
	logger.log("initialized");
}

function getImageAttachment(message: Message): string {
	if (message.attachments.size < 1) {
		message.reply(
			"Sorry, you must attach an image directly. Links won't work.",
		);
		return "";
	}
	if (message.attachments.size > 1) {
		message.reply("Sorry, you must send exactly one image.");
		return "";
	}

	const attachUrl = message.attachments.first()?.url;
	if (
		!attachUrl ||
		(!attachUrl.endsWith(".jpg") && !attachUrl.endsWith(".png"))
	) {
		message.reply(
			"Sorry, I don't recognize that kind of file. It has to be a PNG or JPG image.",
		);
		return "";
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
		name: "Miner",
		desc: "You used to spend all day hauling coal and other metals out of the mines. You're incredibly tough, but the occupational hazard has left you damaged and poor.",

		hp: 3,
		money: 1,
		strength: 5,
		speed: 2,
		toughness: 4,
	},
	{
		name: "Highschool Track Star",
		desc: "Growing up in a wealthy family, all you ever needed to worry about was winning at the next meet.",

		hp: 3,
		money: 3,
		strength: 3,
		speed: 4,
		toughness: 2,
	},
	{
		name: "Labrat",
		desc: "You were subject to numerous government experiments. You've gained some incredible physical abilities, but the experiments took as much as they gave",

		hp: 7,
		money: 0,
		strength: 1,
		speed: 3,
		toughness: 5,
	},
	{
		name: "Mailman",
		desc: "You used to move packages for a living. Now you're hoping for an expedited victory.",

		buff: "Deliverance",
		buffDesc: "Start the game with a completely random item.",

		hp: 4,
		money: 1,
		strength: 4,
		speed: 3,
		toughness: 1,
	},
	{
		name: "Unfortunate Toddler",
		desc: "What are you doing in the hunger games??? Get this kid out of here! Might not actually be a toddler but sure looks like one.",

		buff: "Can't show that on TV",
		buffDesc:
			"Do EVERYTHING with advantage (all RNG effects happen an extra time and take the best result).",

		hp: 3,
		money: 4,
		strength: 1,
		speed: 2,
		toughness: 1,
	},
	{
		name: "Bear Grylls Apostle",
		desc: "You have turned survivalism into a religion. Your Australian accent could use some work though.",

		buff: "Multitool",
		buffDesc: "Receive no passive stat penalties from items.",

		hp: 5,
		money: 0,
		strength: 3,
		speed: 1,
		toughness: 4,
	},
	{
		name: "Glitchy Supersoldier",
		desc: "You're an elite master of everything, but there seem to have been some issues in your software...",

		curse: "Short-circuit",
		curseDesc: "Occasionally lose stats, permanently.",

		hp: 4,
		money: 1,
		strength: 4,
		speed: 4,
		toughness: 4,
	},
	{
		name: "God Gamer",
		desc: "You're as strong as it gets, but you prefer life on its hardest difficulty.",

		curse: "Life on Expert Mode",
		curseDesc:
			"Do EVERYTHING with disadvantage (all RNG effects happen an extra time and take the worst result).",

		hp: 7,
		money: 0,
		strength: 5,
		speed: 5,
		toughness: 5,
	},
	{
		name: "Buffoon",
		desc: "Nobody knows how you survived this long. You're remarkably stupid, but very physically able.",

		curse: "Moronic Abuse",
		curseDesc: "Receive double passive stat penalties from items.",

		hp: 6,
		money: 1,
		strength: 5,
		speed: 2,
		toughness: 3,
	},
];

async function backgroundSelection(
	message: Message,
	isNPC: boolean,
	combatantIdx: number,
) {
	const combatants = grocheGamesCore.combatants;

	await message.reply({
		content: "You're almost done! Please pick a background for yourself.",
	});

	// roll three random backgrounds
	const backgroundChoices: number[] = [];
	while (backgroundChoices.length < 3) {
		const randomChoice = Math.floor(Math.random() * backgrounds.length);
		if (!backgroundChoices.includes(randomChoice)) {
			backgroundChoices.push(randomChoice);
		}
	}

	for (const choice of backgroundChoices) {
		const bg = backgrounds[choice];
		const msg = await message.channel.send({
			content: `Background: **${bg.name}**\n\n${bg.desc}\n\n${
				bg.buff
					? `${bg.buff}: ${bg.buffDesc}\n\n`
					: bg.curse
						? `${bg.curse}: ${bg.curseDesc}\n\n`
						: ""
			}HP: +${bg.hp} / Money: +${bg.money} / STR: +${bg.strength} / SPD: +${
				bg.speed
			} / TGH: +${bg.toughness}`,
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(
							`grochegames-setbackground-${isNPC ? "npc-" : ""}${bg.name}`,
						)
						.setStyle(ButtonStyle.Primary)
						.setLabel("Take this background"),
				),
			],
		});

		combatants[combatantIdx].backgroundMsgIds.push(msg.id);
	}

	grocheGamesCore.combatants = combatants;
}

async function onMessageSend(message: Message) {
	const combatants = grocheGamesCore.combatants;

	// only run this section when user is in their own team channel
	// users only have access to their own team channel, so let's assume if it's a team channel we're fine
	if (combatants.every((fighter) => fighter.teamId !== message.channelId)) {
		return;
	}

	// determine whether user is missing profile pic
	const user = combatants.findIndex(
		(fighter) => fighter.id === message.author.id,
	);

	if (user !== -1) {
		if (combatants[user].picUrl === "") {
			const attachUrl = getImageAttachment(message);

			if (attachUrl !== "") {
				combatants[user].picUrl = attachUrl;
				combatants[user].backgroundMsgIds.push(
					(
						await message.reply({
							content:
								"I've successfully set your image to this. If it looks wrong, you will need to finish this registration and start over by running /register again.",
							embeds: [new EmbedBuilder().setImage(attachUrl)],
						})
					).id,
				);

				message.reply({
					content:
						"Next, please upload a **dead version**. I know I said this was optional earlier, but I lied. Reuse the same image from before if you're lazy.",
				});
				grocheGamesCore.combatants = combatants;
			}
		} else if (combatants[user].picDeadUrl === "") {
			const attachUrl = getImageAttachment(message);
			if (attachUrl !== "") {
				combatants[user].picDeadUrl = attachUrl;
				combatants[user].backgroundMsgIds.push(
					(
						await message.reply({
							content:
								"I've successfully set your image to this. If it looks wrong, you will need to finish this registration and start over by running /register again.",
							embeds: [new EmbedBuilder().setImage(attachUrl)],
						})
					).id,
				);
				grocheGamesCore.combatants = combatants;

				backgroundSelection(message, false, user);
			}
		}
	}

	// determine whether user has a bot ally with missing profile pic
	const botAlly = combatants.findIndex(
		(fighter) => fighter.teamId === message.channelId && fighter.id === "",
	);

	if (botAlly !== -1) {
		if (combatants[botAlly].picUrl === "") {
			// if we are here, we are currently prompting user for profile pic (bot user exists but no pfp set)

			// check for attachments
			const attachUrl = getImageAttachment(message);
			if (attachUrl !== "") {
				combatants[botAlly].picUrl = attachUrl;
				combatants[botAlly].backgroundMsgIds.push(
					(
						await message.reply({
							content:
								"I've successfully set your ally's image to this. If it looks wrong, you will need to finish this registration and start over by running /register again.",
							embeds: [new EmbedBuilder().setImage(attachUrl)],
						})
					).id,
				);
				message.reply({
					content:
						"Next, please upload a **dead version**. I know I said this was optional earlier, but I lied. Reuse the same image from before if you're lazy.",
				});

				grocheGamesCore.combatants = combatants;
			}
		} else if (combatants[botAlly].picDeadUrl === "") {
			// prompting user for dead profile pic
			const attachUrl = getImageAttachment(message);
			if (attachUrl !== "") {
				combatants[botAlly].picDeadUrl = attachUrl;
				combatants[botAlly].backgroundMsgIds.push(
					(
						await message.reply({
							content:
								"I've successfully set your ally's image to this. If it looks wrong, you will need to finish this registration and start over by running /register again.",
							embeds: [new EmbedBuilder().setImage(attachUrl)],
						})
					).id,
				);
				grocheGamesCore.combatants = combatants;

				backgroundSelection(message, true, botAlly);
			}
		}
	}

	//
}

async function setBackground(
	interaction: ButtonInteraction,
	isNPC: boolean,
	backgroundChosen: string,
) {
	logger.log(backgroundChosen);
	const background = backgrounds.find((bg) => bg.name === backgroundChosen);
	if (background) {
		const combatants = grocheGamesCore.combatants;

		logger.log(`is npc: ${isNPC}`);
		// get entry
		const fIdx = combatants.findIndex((fighter) =>
			isNPC
				? fighter.teamId === interaction.channelId && fighter.id === ""
				: fighter.id === interaction.user.id,
		);

		logger.log(`idx : ${fIdx}`);

		if (fIdx === -1) {
			interaction.reply(
				"the entry you are configuring stopped existing somehow. sorry",
			);
		} else {
			combatants[fIdx].baseMoney = background.money;
			combatants[fIdx].baseStrength = background.strength;
			combatants[fIdx].baseSpeed = background.speed;
			combatants[fIdx].baseToughness = background.toughness;
			combatants[fIdx].maxHP = background.hp;
			combatants[fIdx].curHP = background.hp;

			// setting the buffs/debuffs is a bit more annoying (read: hacky)
			if (background.buff) {
				if (background.buff === "Deliverance") {
					combatants[fIdx].hasDeliverance = true;
				} else if (background.buff === "Can't show that on TV") {
					combatants[fIdx].hasLuck = true;
				} else if (background.buff === "Multitool") {
					combatants[fIdx].hasInventive = true;
				} else {
					interaction.reply(
						`sorry, the buff (${background.buff}) on that background is broken. Bug MCFX2 to fix this.`,
					);
				}
			} else if (background.curse) {
				if (background.curse === "Short-circuit") {
					combatants[fIdx].hasShortCircuit = true;
				} else if (background.curse === "Life on Expert Mode") {
					combatants[fIdx].hasExpertMode = true;
				} else if (background.curse === "Moronic Abuse") {
					combatants[fIdx].hasMoronicRage = true;
				} else {
					interaction.reply(
						`sorry, the curse (${background.buff}) on that background is broken. Bug MCFX2 to fix this.`,
					);
				}
			}

			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle(`${combatants[fIdx].name} the ${background.name}`)
						.setURL("https://google.com/")
						.setDescription(
							combatants[fIdx].deathQuote === ""
								? null
								: combatants[fIdx].deathQuote,
						)
						.setImage(combatants[fIdx].picUrl),
					new EmbedBuilder()
						.setTitle(`${combatants[fIdx].name} the ${background.name}`)
						.setURL("https://google.com/")
						.setImage(combatants[fIdx].picDeadUrl),
				],
			});

			await interaction.channel?.send(
				"There you go. You can review all the information above. If it looks wrong, you will need to finish this registration and start over by running /register again.",
			);

			if (isNPC) {
				interaction.channel?.send(
					"Finally, **Please type /register again** to register yourself.",
				);
			} else {
				interaction.channel?.send(
					"And with that, you are registered. Your team name can be set with `/teamname` at any time prior to game start.",
				);
			}

			for (const msg of combatants[fIdx].backgroundMsgIds) {
				try {
					(await interaction.channel?.messages.fetch(msg))?.delete();
				} catch (e) {
					// do nothing
				}
			}

			combatants[fIdx].backgroundMsgIds = [];

			combatants[fIdx].registrationComplete = true;
		}

		grocheGamesCore.combatants = combatants;
	} else {
		interaction.reply(
			`sorry, something fucked up. idk what a ${backgroundChosen} is`,
		);
	}
}

function usePlayerProfilePicture(
	interaction: ButtonInteraction,
	targetId: string,
) {
	if (interaction.user.id !== targetId) {
		logger.log(`${interaction.user.id}|${targetId}`);
		interaction.reply("Hey. That's not for you.");
		return;
	}

	const combatants = grocheGamesCore.combatants;

	const player = combatants.findIndex((fighter) => fighter.id === targetId);

	if (player === -1) {
		interaction.reply(
			"huh?... there is no registered player with your ID, somehow. Sorry.",
		);
		return;
	}

	// determine whether they meant profile pic or death pic
	if (combatants[player].picUrl !== "") {
		combatants[player].picDeadUrl =
			interaction.user.avatarURL({ forceStatic: true }) ?? "";

		backgroundSelection(interaction.message, false, player);
	} else {
		combatants[player].picUrl =
			interaction.user.avatarURL({ forceStatic: true }) ?? "";

		interaction.reply({
			content: "Next, please upload a **dead version**.",
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(`grochegames-useprofilepic-${interaction.user.id}`)
						.setLabel("Or click here to just use your profile picture (again).")
						.setStyle(ButtonStyle.Primary),
				),
			],
		});
	}

	grocheGamesCore.combatants = combatants;
}

function clearMessage(interact: ButtonInteraction, targetUser: string) {
	if (interact.user.id === targetUser) {
		interact.message.delete();
	} else {
		interact.reply(
			"You should learn to keep your hands off of other people's buttons.",
		);
	}
}

function deleteRegistration(interact: ButtonInteraction, targetUser: string) {
	if (interact.user.id !== targetUser) {
		interact.reply(
			"Wooow. That is so toxic. I cannot believe you would even try that. Shame on you.",
		);
		return;
	}
	const actions = new ActionRowBuilder<ButtonBuilder>();

	actions.addComponents(
		new ButtonBuilder()
			.setCustomId(`grochegames-clearmessage-${targetUser}`)
			.setStyle(ButtonStyle.Secondary)
			.setLabel("Nevermind"),
		new ButtonBuilder()
			.setCustomId(`grochegames-deleteplayerregistration-${targetUser}`)
			.setStyle(ButtonStyle.Danger)
			.setLabel("Delete registration for myself"),
	);

	if (teamsWithNpcAllies.includes(interact.channelId)) {
		actions.addComponents(
			new ButtonBuilder()
				.setCustomId(`grochegames-deletenpcregistration-${targetUser}`)
				.setStyle(ButtonStyle.Danger)
				.setLabel("Delete registration for NPC ally"),
			new ButtonBuilder()
				.setCustomId(`grochegames-deleteallregistration-${targetUser}`)
				.setStyle(ButtonStyle.Danger)
				.setLabel("Completely start registration over"),
		);
	}

	interact.reply({
		content:
			"Are you SURE you want to delete your registration? You will have to do it over again.",
		components: [actions],
	});

	interact.message.delete();
}

function deletePlayerRegistration(
	interact: ButtonInteraction,
	targetUser: string,
) {
	if (interact.user.id !== targetUser) {
		interact.reply("Nope. Not your button to click.");
		return;
	}

	const combatants = grocheGamesCore.combatants;

	const cIdx = combatants.findIndex((fighter) => fighter.id === targetUser);

	if (cIdx === -1) {
		interact.reply(
			"...huh. You do not seem to have a registration in the first place.",
		);
		interact.message.delete();
		return;
	}
	combatants.splice(cIdx, 1);
	interact.reply(
		"Registration deleted. You should re-register with `/register` again.",
	);
	interact.message.delete();

	grocheGamesCore.combatants = combatants;
}

function deleteNPCRegistration(
	interact: ButtonInteraction,
	targetUser: string,
) {
	if (interact.user.id !== targetUser) {
		interact.reply("Nope. Not your button to click.");
		return;
	}

	const combatants = grocheGamesCore.combatants;

	const cIdx = combatants.findIndex(
		(fighter) => fighter.teamId === interact.channelId,
	);

	if (cIdx === -1) {
		interact.reply(
			"...huh. This NPC does not seem to have a registration, somehow.",
		);
		interact.message.delete();
		return;
	}
	combatants.splice(cIdx, 1);
	interact.message.delete();

	interact.reply(
		"Registration deleted. You should re-register with `/register` again.",
	);

	grocheGamesCore.combatants = combatants;
}
async function deleteAllRegistration(
	interact: ButtonInteraction,
	targetUser: string,
) {
	if (interact.user.id !== targetUser) {
		interact.reply("Nope. Not your button to click.");
		return;
	}

	let alreadyReplied = false;

	const combatants = grocheGamesCore.combatants;

	const cIdx = combatants.findIndex((fighter) => fighter.id === targetUser);

	if (cIdx === -1) {
		await interact.reply(
			"...huh. You do not seem to have a registration in the first place.",
		);
		alreadyReplied = true;
	} else {
		combatants.splice(cIdx, 1);
	}

	const nIdx = combatants.findIndex(
		(fighter) => fighter.teamId === interact.channelId,
	);

	if (nIdx === -1) {
		if (alreadyReplied) {
			await interact.followUp(
				"...huh. Your NPC ally does not seem to have a registration in the first place.",
			);
		} else {
			await interact.reply(
				"...huh. Your NPC ally does not seem to have a registration in the first place.",
			);
			alreadyReplied = true;
		}
	} else {
		combatants.splice(nIdx, 1);
	}

	if (alreadyReplied) {
		await interact.followUp(
			"Registration deleted. You should re-register with `/register` again.",
		);
	} else {
		await interact.reply(
			"Registration deleted. You should re-register with `/register` again.",
		);
	}

	interact.message.delete();

	grocheGamesCore.combatants = combatants;
}

function onInteract(interaction: Interaction): boolean {
	// filter by interaction type
	if (interaction.isModalSubmit()) {
		logger.log(interaction.customId);
		// filter to our module
		if (interaction.customId.startsWith("grochegames-")) {
			const filteredId = interaction.customId.substring(
				"grochegames-".length,
				interaction.customId.length,
			);

			// figure out what kind of modal we're handling
			if (filteredId.startsWith("wizard")) {
				if (filteredId.endsWith("-npc")) {
					setBaseRegistration(interaction, true);
				} else {
					setBaseRegistration(interaction, false);
				}
			}
			return true;
		}
		return false;
	}
	if (interaction.isButton()) {
		logger.log(interaction.customId);
		if (interaction.customId.startsWith("grochegames-")) {
			const filteredId = interaction.customId.substring(
				"grochegames-".length,
				interaction.customId.length,
			);

			// figure out what kind of button we're handling
			if (filteredId.startsWith("setbackground-")) {
				const tokens = filteredId.split("-");
				const npc = tokens[1] === "npc";
				setBackground(interaction, npc, tokens[npc ? 2 : 1]);
			} else if (filteredId.startsWith("useprofilepic-")) {
				const tokens = filteredId.split("-");
				usePlayerProfilePicture(interaction, tokens[1]);
			} else if (filteredId.startsWith("clearmessage-")) {
				const tokens = filteredId.split("-");
				clearMessage(interaction, tokens[1]);
			} else if (filteredId.startsWith("deleteregistration-")) {
				const tokens = filteredId.split("-");
				deleteRegistration(interaction, tokens[1]);
			} else if (filteredId.startsWith("deleteplayerregistration-")) {
				const tokens = filteredId.split("-");
				deletePlayerRegistration(interaction, tokens[1]);
			} else if (filteredId.startsWith("deletenpcregistration-")) {
				const tokens = filteredId.split("-");
				deleteNPCRegistration(interaction, tokens[1]);
			} else if (filteredId.startsWith("deleteallregistration-")) {
				const tokens = filteredId.split("-");
				deleteAllRegistration(interaction, tokens[1]);
			} else {
				logger.log(
					`Unknown button interaction: ${interaction.customId}`,
					WarningLevel.Warning,
				);
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
	const combatants = grocheGamesCore.combatants;

	if (includeNPC) {
		const npcName = interaction.fields.getTextInputValue("npcname");
		const npcHePronoun = interaction.fields
			.getTextInputValue("npcpronounhe")
			.toLowerCase();
		const npcHimPronoun = interaction.fields
			.getTextInputValue("npcpronounhim")
			.toLowerCase();

		const npcDeathQuote = interaction.fields.getTextInputValue("npcdeathquote");

		const npcFighter = new GrocheGamesCombatant();

		npcFighter.name = npcName;
		npcFighter.pronounHe = npcHePronoun;
		npcFighter.pronounHim = npcHimPronoun;
		npcFighter.deathQuote = npcDeathQuote;
		npcFighter.teamId = interaction.channelId ?? "";

		// end interaction chain by prompting user to /register again, to set up their own character

		interaction
			.reply({
				content: `You've successfully registered an NPC ally. Next, **please upload a photo you would like to use for the bot.** It must be uploaded to this channel, it cannot be a link.\n\nYou just registered **${npcName}**. ${npcHePronoun} is an NPC ally of yours${
					npcDeathQuote !== ""
						? `, and will utter the following phrase when ${npcHePronoun} finds ${npcHimPronoun}self dead:\n\n${npcDeathQuote}`
						: "."
				}\n\nIf it looks wrong, you will need to finish this registration and start over by running /register again.`,
			})
			.then((interact) => {
				npcFighter.backgroundMsgIds.push(interact.id);
			});

		combatants.push(npcFighter);
	} else {
		const name = interaction.fields.getTextInputValue("name");
		const hePronoun = interaction.fields
			.getTextInputValue("pronounhe")
			.toLowerCase();
		const himPronoun = interaction.fields
			.getTextInputValue("pronounhim")
			.toLowerCase();

		const deathQuote = interaction.fields.getTextInputValue("deathquote");

		const fighter = new GrocheGamesCombatant();

		fighter.name = name;
		fighter.pronounHe = hePronoun;
		fighter.pronounHim = himPronoun;
		fighter.deathQuote = deathQuote;
		fighter.teamId = interaction.channelId ?? "";
		fighter.id = interaction.user.id;

		interaction
			.reply({
				content: `You've successfully registered yourself. Next, **please upload a photo you would like to use for yourself.** It must be uploaded to this channel, it cannot be a link.\n\nYou just registered as **${name}**.${
					deathQuote !== ""
						? `When ${hePronoun} dies, ${hePronoun} will say:\n\n${deathQuote}`
						: ""
				}\n\nIf any of this looks wrong, you will have to complete registration and then start over by running /register again.`,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`grochegames-useprofilepic-${interaction.user.id}`)
							.setLabel("Or click here to just use your profile picture.")
							.setStyle(ButtonStyle.Primary),
					),
				],
			})
			.then((interact) => {
				fighter.backgroundMsgIds.push(interact.id);
			});
		combatants.push(fighter);
	}

	grocheGamesCore.combatants = combatants;
}

function playerRegistryModal(interaction: ChatInputCommandInteraction) {
	const wizard = new ModalBuilder()
		.setCustomId("grochegames-wizard")
		.setTitle("Player Registration Form");

	const wizardItems: ActionRowBuilder<TextInputBuilder>[] = [];

	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("name")
				.setMaxLength(24)
				.setMinLength(2)
				.setLabel("Your name")
				.setRequired(true)
				.setValue(interaction.user.username)
				.setPlaceholder("The Rulesmeister")
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("pronounhe")
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel("Your first pronoun")
				.setValue("he")
				.setRequired(true)
				.setPlaceholder("he/she/they/it")
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("pronounhim")
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel("Your second pronoun")
				.setValue("him")
				.setPlaceholder("him/her/them/it")
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("deathquote")
				.setLabel("Your dying quote")
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
		.setCustomId("grochegames-wizard-npc")
		.setTitle("NPC Ally Registration Form");

	const wizardItems: ActionRowBuilder<TextInputBuilder>[] = [];

	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("npcname")
				.setMaxLength(24)
				.setMinLength(2)
				.setLabel("Name of your NPC ally")
				.setPlaceholder("Bobert the Buildert")
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("npcpronounhe")
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel("First pronoun of your NPC ally")
				.setValue("he")
				.setPlaceholder("he/she/they/it")
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("npcpronounhim")
				.setMaxLength(8)
				.setMinLength(2)
				.setLabel("Second pronoun of your NPC ally")
				.setValue("him")
				.setPlaceholder("him/her/them/it")
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		),
	);
	wizardItems.push(
		new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("npcdeathquote")
				.setLabel("Dying quote")
				.setPlaceholder("i am slain. how could this happen. explain.")
				.setRequired(false)
				.setMaxLength(500)
				.setStyle(TextInputStyle.Paragraph),
		),
	);

	wizard.setComponents(wizardItems);
	interaction.showModal(wizard);
}

const teamsWithNpcAllies: string[] = [
	"1061333833091383336",
	"1061333864250875965",
	"1061333881086808084",
	"1061333894030426172",
	"1061333907779362856",
	"1061333920005758996",
	"1061333931724656640", // team morons - special
];

export function teamNameCommand(interaction: ChatInputCommandInteraction) {
	// validity checks
	const combatants = grocheGamesCore.combatants;

	// ensure command was done in team channel

	const teamId = interaction.channelId;
	if (combatants.every((fighter) => fighter.teamId !== teamId)) {
		interaction.reply({
			content:
				"You either haven't registered yet, in which case do that first, or you're trying to run this outside your team channel. Fix that and try again.",
			ephemeral: true,
		});
		return;
	}

	const name = interaction.options.getString("name", true);

	// set team name internally
	for (let i = 0; i < combatants.length; ++i) {
		if (combatants[i].teamId === teamId) {
			combatants[i].team = name;
		}
	}
	// rename team channel
	// remove all spaces and special characters, make lowercase
	const filteredName = name
		.toLowerCase()
		.replace(/ /g, "-")
		.replace(/([^a-z0-9\-_]+)/gi, "");

	(interaction.channel as TextChannel).setName(`team-${filteredName}`);

	grocheGamesCore.combatants = combatants;
}

export function registerTeamCommand(interaction: ChatInputCommandInteraction) {
	logger.log(`registering user in channel ${interaction.channelId}`);

	let shouldRegisterPlayer = false;

	// check if there is already a bot being registered in this channel
	const existingNpc = grocheGamesCore.combatants.find(
		(fighter) => fighter.teamId === interaction.channelId && fighter.id === "",
	);

	const existingPlayer = grocheGamesCore.combatants.find(
		(fighter) => fighter.id === interaction.user.id,
	);

	if (existingNpc) {
		if (existingNpc.registrationComplete) {
			// check against player too
			if (existingPlayer) {
				if (existingPlayer.registrationComplete) {
					interaction.reply({
						content:
							"You have already completed registration. Would you like to delete your registration and start over?",
						components: [
							new ActionRowBuilder<ButtonBuilder>().addComponents(
								new ButtonBuilder()
									.setStyle(ButtonStyle.Secondary)
									.setCustomId(`grochegames-clearmessage-${existingPlayer.id}`)
									.setLabel("Cancel (keep registration)"),
								new ButtonBuilder()
									.setStyle(ButtonStyle.Danger)
									.setCustomId(
										`grochegames-deleteregistration-${existingPlayer.id}`,
									)
									.setLabel("Delete registration"),
							),
						],
					});
					return;
				}
				interaction.reply(
					"You seem to already be in the middle of registration. Finish that first.",
				);
				return;
			}
			shouldRegisterPlayer = true;
		} else {
			interaction.reply(
				"You seem to already have an NPC registration in progress. Finish that first.",
			);
			return;
		}
	}

	if (
		!shouldRegisterPlayer &&
		!teamsWithNpcAllies.includes(interaction.channelId)
	) {
		if (existingPlayer) {
			if (existingPlayer.registrationComplete) {
				interaction.reply({
					content:
						"You have already completed registration. Would you like to delete your registration and start over?",
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(`grochegames-clearmessage-${existingPlayer.id}`)
								.setLabel("Cancel (keep registration)"),
							new ButtonBuilder()
								.setStyle(ButtonStyle.Danger)
								.setCustomId(
									`grochegames-deleteregistration-${existingPlayer.id}`,
								)
								.setLabel("Delete registration"),
						),
					],
				});
				return;
			}
			interaction.reply(
				"You seem to already be in the middle of registration. Finish that first.",
			);
			return;
		}
		shouldRegisterPlayer = true;
	}

	if (!shouldRegisterPlayer) {
		npcRegistryModal(interaction);
	} else {
		playerRegistryModal(interaction);
	}
}
