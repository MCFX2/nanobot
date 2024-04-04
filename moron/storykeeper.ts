import {
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	type Guild,
	type GuildMember,
	type Message,
	type MessageReaction,
	type TextChannel,
	type User,
} from "discord.js";
import type { MoronModule } from "./moronmodule";
import { readCacheFileAsJson, writeCacheFileAsJson } from "./util";
import * as grocheChannels from "../groche-channels.json";
import { Logger, WarningLevel } from "./logger";

interface StorykeeperConfig {
	// the role that provides access to the storykeeper system
	accessRoleId: string;
	// the channel where gaming moron will post information about how to use storykeeper
	overviewChannelId: string;
	// the channel where gaming moron will post old, saved submissions for previous prompts
	archiveChannelId: string;
	// the channel where gaming moron will post and accept new prompts
	submissionChannelId: string;
	// the messageID of the message that contains the opt-in reaction
	featureOptInMessage: string;
}

interface StorykeeperStatus {
	submissionsOpen: boolean;
	submissionVoting: boolean;
}

let config: StorykeeperConfig;
let status: StorykeeperStatus;

const logger: Logger = new Logger("storykeeper", WarningLevel.Notice);

export const Storykeeper: MoronModule = {
	name: "storykeeper",
	onInit: storykeeper_init,
	onReactionAdd: storykeeper_react,
	onReactionRemove: storykeeper_unreact,
	onMessageSend: storykeeper_msg,
};

let clientInstance: Client;
let guild: Guild;

// structure containing the raw data needed to construct a submission
interface StorySubmission {
	userId: string; // for linking together submissions from the same user
	msgId: string; // we don't actually store the message, just the ID. this gives us support for editing messages

	attachments?: string[]; // todo
	nextMsg?: StorySubmission; // todo
}

let pendingSubmissions: StorySubmission[] = [];

let prompts: string[] = [];

// constructed submission
interface StoryEntry {
	content: string[];
	username: string;
	userAvatar: string;
	attachments?: string[][]; // todo
	title?: string; // todo
}

function loadSubmissions() {
	pendingSubmissions =
		readCacheFileAsJson("storykeeper-submissions.json") ?? [];
}

function saveSubmissions() {
	writeCacheFileAsJson("storykeeper-submissions.json", pendingSubmissions);
}

function loadPrompts() {
	prompts = readCacheFileAsJson("storykeeper-prompts.json") ?? [];
}

function savePrompts() {
	writeCacheFileAsJson("storykeeper-prompts.json", prompts);
}

function loadStatus() {
	status = readCacheFileAsJson("storykeeper-status.json");
	if (!status) {
		status = {
			submissionsOpen: false,
			submissionVoting: false,
		};
	}
}

function saveStatus() {
	writeCacheFileAsJson("storykeeper-status.json", status);
}

// makes a new channel with the given title, and returns its ID
async function generateChannel(label: string): Promise<TextChannel> {
	const newChannel = await guild.channels.create({
		name: label,
		type: ChannelType.GuildText,
	});

	newChannel.permissionOverwrites.create(config.accessRoleId, {
		ViewChannel: true,
	});

	newChannel.permissionOverwrites.edit(guild.roles.everyone, {
		ViewChannel: false,
	});

	return newChannel;
}

async function getAllEntrants(): Promise<GuildMember[]> {
	const role = await guild.roles.fetch(config.accessRoleId);
	if (!role) {
		logger.log("Could not find access role", WarningLevel.Error);
		return [];
	}

	const results: Promise<GuildMember>[] = [];
	for (const member of role.members) {
		results.push(member[1].fetch());
	}

	return await Promise.all(results);
}

async function getMessageContent(
	submission: StorySubmission,
): Promise<StoryEntry> {
	const submissions: StorySubmission[] = [submission];
	let curSubmission = submission;
	while (curSubmission.nextMsg) {
		submissions.push(curSubmission.nextMsg);
		curSubmission = curSubmission.nextMsg;
	}

	const content: string[] = [];
	const attachments: string[][] = [];
	const user = await guild.members.fetch(submissions[0].userId);
	const channel = await user.createDM();

	for (const item of submissions) {
		const msg = await channel.messages.fetch(item.msgId);
		if (msg) {
			content.push(msg.content);
			attachments.push(msg.attachments.map((attachment) => attachment.url));
		}
	}

	const guildUser = await guild.members.fetch({ user: submissions[0].userId });

	return {
		content: content,
		username: guildUser.displayName,
		userAvatar: guildUser.user.avatarURL() ?? "",
		attachments: attachments,
	};
}

export async function storykeeper_postPrompt() {
	const archiveChannel = (await guild.channels.fetch(
		config.archiveChannelId,
	)) as TextChannel;

	const prompt = prompts.splice(
		Math.floor(Math.random() * prompts.length),
		1,
	)[0];

	if (!prompt) {
		archiveChannel.send(
			"no prompts available. please add some. storykeeper cancelled this week.",
		);
		return;
	}

	archiveChannel.send({
		content: `<@&${config.accessRoleId}>`,
		embeds: [
			new EmbedBuilder()
				.setTitle("Weekly Prompt")
				.setDescription(prompt)
				.setTimestamp(Date.now()),
		],
	});

	savePrompts();
	status.submissionsOpen = true;
	saveStatus();
}

export async function storykeeper_closeSubmissions() {
	if (!status.submissionsOpen) return;
	// pull in all the submissions so we can get ready to post them tomorrow
	const submissions: StoryEntry[] = [];
	for (const submission of pendingSubmissions) {
		submissions.push(await getMessageContent(submission));
	}

	if (submissions.length <= 2) {
		const archiveChannel = (await guild.channels.fetch(
			config.archiveChannelId,
		)) as TextChannel;
		archiveChannel.send(
			`not enough submissions. only got ${submissions.length}. storykeeper cancelled this week.`,
		);
		status.submissionsOpen = false;
		return;
	}

	writeCacheFileAsJson("storykeeper-entries.json", submissions);

	pendingSubmissions.length = 0;
	saveSubmissions();

	status.submissionsOpen = false;
	saveStatus();
}

export async function storykeeper_postReminder() {
	if (!status.submissionsOpen) return;

	const storytellers = await getAllEntrants();

	for (const storyteller of storytellers) {
		storyteller.send(
			`reminder: submissions close in 12 hours. get your submission in and finalized if you haven't already.${
				pendingSubmissions.length > 2
					? ""
					: `\nFYI if we do not get at least ${
							3 - pendingSubmissions.length
						} more submissions, this week's prompt will be cancelled.`
			}`,
		);
	}
}

let voteMsgs: string[] = [];

export async function storykeeper_startVoting() {
	status.submissionVoting = true;
	saveStatus();

	const subChannel = (await guild.channels.fetch(
		config.submissionChannelId,
	)) as TextChannel;

	const entries: StoryEntry[] =
		readCacheFileAsJson("storykeeper-entries.json") ?? [];

	writeCacheFileAsJson("storykeeper-entries.json", []);

	if (entries.length <= 2) {
		return;
	}

	await subChannel.send({
		content: `<@&${config.accessRoleId}> Come see the lovely submissions this week:`,
	});

	voteMsgs = [];

	for (const entry of entries) {
		const embeds: EmbedBuilder[] = [];
		for (const content of entry.content) {
			const text =
				content !== ""
					? content
					: "[There was an error fetching this message- it was probably deleted]";

			embeds.push(
				new EmbedBuilder().setDescription(text).setAuthor({
					name: entry.username,
					iconURL: entry.userAvatar,
				}),
			);
		}

		const msg = await subChannel.send({ embeds: embeds });
		voteMsgs.push(msg.id);
		msg.react("🔼");
	}

	writeCacheFileAsJson("storykeeper-votes.json", voteMsgs);
}

export async function storykeeper_finalizeVoting() {
	if (!status.submissionVoting) {
		return;
	}
	status.submissionVoting = false;
	saveStatus();

	const messages: Message[] = [];
	const channel = (await clientInstance.channels.fetch(
		config.submissionChannelId,
	)) as TextChannel;
	for (const msgId of voteMsgs) {
		const msg = await channel.messages.fetch(msgId);
		if (msg) {
			messages.push(msg);
		}
	}

	const subs: EmbedBuilder[][] = [];
	const votes: number[] = [];
	for (const msg of messages) {
		const newEmbeds: EmbedBuilder[] = [];
		for (const embed of msg.embeds) {
			newEmbeds.push(new EmbedBuilder(embed.data));
		}
		subs.push(newEmbeds);
		votes.push((msg.reactions.resolve("🔼")?.count ?? 1) - 1);
		msg.delete();
	}

	const archiveChannel = (await clientInstance.channels.fetch(
		config.archiveChannelId,
	)) as TextChannel;

	for (let i = 0; i < subs.length; i++) {
		const embeds = subs[i];

		embeds[0] = embeds[0].setFooter({
			text: `+${votes[i]}`,
		});

		archiveChannel.send({ embeds: embeds });
	}

	// clear the vote cache
	voteMsgs = [];
	writeCacheFileAsJson("storykeeper-votes.json", voteMsgs);
}

export function storykeeper_addPrompt(interact: ChatInputCommandInteraction) {
	const prompt = interact.options.getString("prompt");

	if (!prompt) {
		interact.reply("you need to provide a prompt, you absolute buffoon");
		return;
	}

	prompts.push(prompt);
	savePrompts();

	interact.reply("i have added the prompt, master");
}

async function storykeeper_msg(msg: Message) {
	if (msg.channel.isDMBased()) {
		const entrants = await getAllEntrants();

		const member = entrants.find((member) => member.id === msg.author.id);

		if (!member) {
			msg.reply(
				"hey buddy. you are not part of the storykeeper system. you need to react to the role in game groches. mommy is not going to talk to you until you do uwu",
			);
			return;
		}

		if (!status.submissionsOpen) {
			msg.reply(
				"submissions are not open right now. wait until the next prompt is posted in the storykeeper-archive channel.",
			);
			return;
		}

		if (msg.attachments.size > 0) {
			msg.channel.send(
				"just a heads up, your message includes attachments. they will not be included in your submission.",
			);
		}

		// see if there's an existing submission from this user to append
		const existingSubmission = pendingSubmissions.findIndex(
			(submission) => submission.userId === msg.author.id,
		);
		if (existingSubmission === -1) {
			pendingSubmissions.push({
				userId: msg.author.id,
				msgId: msg.id,
			});
			saveSubmissions();
			msg.react("✅");
			return;
		}

		let curSubmission = pendingSubmissions[existingSubmission];
		// find the last message in the chain
		while (curSubmission.nextMsg) {
			curSubmission = curSubmission.nextMsg;
		}

		curSubmission.nextMsg = {
			userId: msg.author.id,
			msgId: msg.id,
		};

		msg.react("✅");
		saveSubmissions();
	}
}

async function storykeeper_init(client: Client) {
	// temporary

	/* const channel = await client.channels.fetch('1123271809442258994') as TextBasedChannel;
	const msg2 = await channel.messages.fetch('1123271813359738922');
	msg2.edit('NOTE, there are currently (for now) some technical limitations for submissions. these limitations are:\n'
	+ '- submissions can\'t contain images*\n'
	+ '- submissions can\'t contain any other embeds\n'
	+ '- links will not function (correctly)*\n'
	+ '- some formatting may not work or may display differently compared to your submission. particularly, code blocks do not work\n'
	+ 'generally my advice is just avoid doing anything fancy and you should be fine. focus on putting some good words in there\n\n'
	+ '\\**there are plans to remove these limitations in the future, but for now you will have to work around them.*')
	*/

	clientInstance = client;
	const guilds = await client.guilds.fetch();
	const guildFound = guilds.find((guild) => guild.id === grocheChannels.guild);

	if (!guildFound) {
		logger.log(
			"Could not find server.. is guildID configured correctly?",
			WarningLevel.Error,
		);
	} else {
		guild = await guildFound.fetch();
	}

	loadSubmissions();
	loadPrompts();
	loadStatus();
	voteMsgs = readCacheFileAsJson("storykeeper-votes.json") ?? [];

	// set up channels and roles if needed
	config = readCacheFileAsJson("storykeeper-config.json");

	if (!config) {
		logger.log(
			"Storykeeper config not found, generating new config",
			WarningLevel.Notice,
		);

		// generate channels and roles, and config file
		const newAccessRole = await guild.roles.create({
			color: "DarkButNotBlack",
			mentionable: true,
			name: "Storyteller",
		});

		config = {
			accessRoleId: newAccessRole.id,
			archiveChannelId: "",
			overviewChannelId: "",
			submissionChannelId: "",
			featureOptInMessage: "",
		};

		const newChannels = await Promise.all([
			generateChannel("storykeeper-overview"),
			generateChannel("storykeeper-archive"),
			generateChannel("storykeeper-submissions"),
		]);

		config.overviewChannelId = newChannels[0].id;
		const featureOptInMessage = await newChannels[0].send(
			"Greetings travellers, friends, comrades, countrymen, romans, uh... gamers, and welcome to the storyteller system.\n\n" +
				"This is a system meant to ~~show off~~ practice your creative writing skills, via a weekly writing prompt. " +
				" if i remember\n\n" +
				"If you would like to participate, you will have to react to this with the <:jii:858718630874447893> emote." +
				" this will give you access to the other channels, opt you into pings, and let you see past submissions.\n\n" +
				" please do it.imm literallly beggininng you",
		);

		await newChannels[0].send(
			"NOTE, there are currently (for now) some technical limitations for submissions. these limitations are:\n" +
				"- submissions can't contain images*\n" +
				"- submissions can't contain any other embeds\n" +
				"- links will not function (correctly)*\n" +
				"- some formatting may not work or may display differently compared to your submission. particularly, code blocks do not work\n" +
				"generally my advice is just avoid doing anything fancy and you should be fine. focus on putting some good words in there\n\n" +
				"* *there are plans to remove these limitations in the future, but for now you will have to work around them.*",
		);

		await newChannels[0].send(
			"** How to submit:**\n" +
				" 1. DM me (gaming moron) with your submission." +
				" 2. i will react confirming that your submission was accepted.\n" +
				"thats literally it. thats all you have to do. some other notes, however:\n" +
				"- you can submit at any time during the week, but submissions will be closed at 6PM GMT (gaming moron time, also known as PST) on Saturday\n" +
				"- submissions will be posted on Sunday, at 6PM\n" +
				"- if 2 or fewer submissions are entered by submission close, that week's prompts will be cancelled.\n" +
				"- there is no requirement for style, length, quality, or adherence to the prompt. just submit literally anything.\n" +
				"- submissions will be voted on Sunday night and winners finalized Monday afternoon.\n" +
				"- winners receive 1 point, unless they won last week. in that case, they can give their point to their favorite submission",
		);

		newChannels[0].permissionOverwrites.edit(guild.roles.everyone, {
			ViewChannel: true,
			SendMessages: false,
		});

		config.featureOptInMessage = featureOptInMessage.id;

		config.archiveChannelId = newChannels[1].id;

		newChannels[1].permissionOverwrites.edit(guild.roles.everyone, {
			SendMessages: false,
		});

		config.submissionChannelId = newChannels[2].id;

		newChannels[2].permissionOverwrites.edit(config.accessRoleId, {
			ViewChannel: false,
			SendMessages: false,
		});

		writeCacheFileAsJson("storykeeper-config.json", config);

		logger.log("Storykeeper config generated", WarningLevel.Notice);
	}
}

async function updateRole(react: MessageReaction) {
	// jii emote id is 858718630874447893
	if (
		react.message.id !== config.featureOptInMessage ||
		react.emoji.id !== "858718630874447893"
	) {
		return;
	}

	const users = await react.users.fetch();
	const registeredUsers = (await guild.roles.fetch(config.accessRoleId))
		?.members;
	// remove all users that should no longer be registered
	if (registeredUsers) {
		for (const user of registeredUsers) {
			if (!users.has(user[0])) {
				await user[1].roles.remove(config.accessRoleId);
			}
		}
	}

	// add any users that should be reigstered
	for (const user of users) {
		if (!registeredUsers?.has(user[0])) {
			const member = await guild.members.fetch(user[0]);
			if (member) {
				await member.roles.add(config.accessRoleId);
			} else {
				logger.log(
					`Could not find member '${user[0]}' that reacted to feature opt-in message`,
					WarningLevel.Warning,
				);
			}
		}
	}
}

async function storykeeper_react(react: MessageReaction, user: User) {
	if (status.submissionVoting) {
		if (voteMsgs.includes(react.message.id) && react.emoji.name === "🔼") {
			// only allow user to vote for one submission
			const messageCandidates = [];
			for (const sub in voteMsgs) {
				const message = await react.message.channel.messages.fetch(sub);
				if (message) {
					messageCandidates.push(message);
				}
			}

			for (const message of messageCandidates) {
				if (message.id !== react.message.id) continue;
				// remove all other reactions by this user
				const reactions = message.reactions.resolve("🔼");
				if (reactions) {
					reactions.users.remove(user.id);
				}
			}
		}
	}

	updateRole(react);
}

async function storykeeper_unreact(react: MessageReaction) {
	updateRole(react);
}
