import { ChannelType, Client, Guild, MessageReaction, OverwriteType, PermissionsBitField, TextChannel } from "discord.js";
import { MoronModule } from "./moronmodule";
import { readCacheFileAsJson, writeCacheFileAsJson } from "./util";
import * as grocheChannels from '../groche-channels.json';
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

let config: StorykeeperConfig;

const logger: Logger = new Logger('storykeeper', WarningLevel.Notice);

export const Storykeeper: MoronModule = {
	name: "storykeeper",
	onInit: storykeeper_init,
	onReactionAdd: storykeeper_react,
	onReactionRemove: storykeeper_react,
}

let clientInstance: Client;
let guild: Guild;

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
	}
	);

	return newChannel;
}

async function storykeeper_init(client: Client) {
	clientInstance = client;
	const guilds = await client.guilds.fetch();
	const guildFound = guilds.find(guild => guild.id === grocheChannels.guild);

	if (!guildFound) {
		logger.log('Could not find server.. is guildID configured correctly?', WarningLevel.Error);
	}
	else
	{
		guild = await guildFound.fetch();
	}


	// set up channels and roles if needed
	config = readCacheFileAsJson('storykeeper-config.json');
	
	if (!config)
	{
		logger.log('Storykeeper config not found, generating new config', WarningLevel.Notice);

		// generate channels and roles, and config file
		const newAccessRole = await guild.roles.create({
			color: "DarkButNotBlack",
			mentionable: true,
			name: "Storyteller",
		});

		config = {
			accessRoleId: newAccessRole.id,
			archiveChannelId: '',
			overviewChannelId: '',
			submissionChannelId: '',
			featureOptInMessage: '',
		};

		const newChannels = await Promise.all([
			generateChannel('storykeeper-overview'),
			generateChannel('storykeeper-archive'),
			generateChannel('storykeeper-submissions'),
		]);

		config.overviewChannelId = newChannels[0].id;
		const featureOptInMessage = await newChannels[0].send(
			'Greetings travellers, friends, comrades, countrymen, romans, uh... gamers, and welcome to the storyteller system.\n\n'
			+ 'This is a system meant to ~~show off~~ practice your creative writing skills, via a weekly writing prompt. '
			+ ' if i remember\n\n' +
			'If you would like to participate, you will have to react to this with the <:jii:858718630874447893> emote.'
			+ ' this will give you access to the other channels, opt you into pings, and let you see past submissions.\n\n'
			+ ' please do it.imm literallly beggininng you');
		
		await newChannels[0].send(
			'NOTE, there are currently (for now) some technical limitations for submissions. these limitations are:\n'
			+ '- submissions must be a single message*\n'
			+ '- submissions can\'t contain images*\n'
			+ '- submissions can\'t contain any other embeds\n'
			+ '- links will not function (correctly)*\n'
			+ '- if you have nitro and use the feature to send messages longer than 2000 characters, the bot will break*\n'
			+ '- some formatting may not work or may display differently compared to your submission. particularly, code blocks do not work\n'
			+ 'generally my advice is just avoid doing anything fancy and you should be fine. focus on putting some good words in there\n\n'
			+ '* *there are plans to remove these limitations in the future, but for now you will have to work around them.*'
		);

		await newChannels[0].send('** How to submit:**\n'
			+ ' 1. DM me (gaming moron) with your submission.'
			+ ' 2. i will reply confirming that your submission was accepted.\n'
			+ 'thats literally it. thats all you have to do. some other notes, however:\n'
			+ '- you can submit at any time during the week, but submissions will be closed at 6PM GMT (gaming moron time, also known as PST) on Saturday\n'
			+ '- submissions will be posted on Sunday, at 6PM\n'
			+ '- if 2 or fewer submissions are entered by submission close, that week\'s prompts will be cancelled.\n'
			+ '- there is no requirement for style, length, quality, or adherence to the prompt. just submit literally anything.\n'
			+ '- submissions will be voted on Sunday night and winners finalized Monday afternoon.\n'
			+ '- winners receive 1 point, unless they won last week. in that case, they can give their point to their favorite submission'
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
		
		writeCacheFileAsJson('storykeeper-config.json', config);

		logger.log('Storykeeper config generated', WarningLevel.Notice);
	}
}

async function storykeeper_react(react: MessageReaction)
{
	// jii emote id is 858718630874447893
	if (react.message.id !== config.featureOptInMessage || react.emoji.id !== '858718630874447893')
	{
		return;
	}

	const users = await react.users.fetch();
	const registeredUsers = (await guild.roles.fetch(config.accessRoleId))?.members;
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
			} 
			else {
				logger.log('Could not find member \'' + user[0] + '\' that reacted to feature opt-in message',
					WarningLevel.Warning);
			}
		}
	}
}