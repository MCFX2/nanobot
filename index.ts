import {
	ActivityType,
	CacheType,
	Client,
	Collection,
	GatewayIntentBits,
	Interaction,
	Message,
	MessageReaction,
	Partials,
	SlashCommandBuilder,
} from 'discord.js';
import { token } from './tokens.json';
import { Logger, WarningLevel } from './moron/logger';
import { chatty_init } from './moron/chatty';
import { Reactor } from './moron/reactor';
import { daily_init } from './moron/daily';
import { stars_init } from './moron/stars';
import { twitfix_init } from './moron/twitfix';

import * as path from 'node:path';
import * as fs from 'node:fs';
import { MoronModule } from './moron/moronmodule';
import { TwitFollow } from './moron/feeds/twitfollow';

export class ExtendedClient extends Client {
	commands: Collection<
		string,
		{
			data: SlashCommandBuilder;
			execute: (interaction: Interaction) => Promise<void>;
		}
	> = new Collection();
}

let logger: Logger = new Logger('core', WarningLevel.Notice);
logger.log('Bot starting...');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	presence: {
		activities: [{ name: 'your mom', type: ActivityType.Competing }],
		status: 'dnd',
	},
	partials: [
		Partials.User,
		Partials.Message,
		Partials.Channel,
		Partials.Reaction,
	],
}) as ExtendedClient;

client.commands = new Collection();

///
/// init
///

// load commands
const baseCommandPath = path.join(__dirname, 'moron', 'commands');

function loadCommands(subdir: string) {
	const commandsPath = path.join(baseCommandPath, subdir);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter(file => file.endsWith('.js'));

	logger.log(commandFiles.length.toString());
}

let commandFiles: string[] = [];

function getAllCommands(directory: string) {
	fs.readdirSync(directory).forEach(file => {
		const abs = path.join(directory, file);
		if (fs.statSync(abs).isDirectory()) {
			getAllCommands(abs);
		} else if (abs.endsWith('.js')) {
			commandFiles.push(abs);
		}
		return;
	});
}

function loadAllCommands() {
	getAllCommands('moron/commands/');

	for (const file of commandFiles) {
		const command = require(__dirname + '/' + file);

		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			logger.log('Unrecognized command in file ' + file, WarningLevel.Warning);
		}
	}
}

loadAllCommands();

// init modules

let modules: MoronModule[] = [Reactor, TwitFollow];

type InitCallback = (client: Client) => Promise<void>;

let initCallbacks: InitCallback[] = [
	stars_init,
	chatty_init,
	daily_init,
	twitfix_init,
];

client.once('ready', async () => {
	// init modules
	await Promise.allSettled(
		initCallbacks.map(cb => {
			try {
				cb(client);
			} catch (err: any) {
				logger.log(
					'Exception thrown when initializing module ' + cb.name,
					WarningLevel.Error,
				);
				logger.log(err, WarningLevel.Error);
			}
		}),
	);

	await Promise.allSettled(
		modules.map(mod => {
			try {
				if (mod.onInit) mod.onInit(client);
			} catch (err: any) {
				logger.log(
					'Exception thrown when initializing module ' + mod.name,
					WarningLevel.Error,
				);
				logger.log(err, WarningLevel.Error);
			}
		}),
	);
	// all done

	logger.log('Bot started');
});

///
/// commands
///

type InteractionCallback = (
	message: Interaction<CacheType>,
) => Promise<boolean>;

let interactionCallbacks: InteractionCallback[] = [];

// return true in your listener if you handled the command successfully
// this ensures multiple different systems don't end up responding to the same command
export function registerInteractionListener(listener: InteractionCallback) {
	interactionCallbacks.push(listener);
}

client.on('interactionCreate', async interaction => {
	if (interaction.isChatInputCommand()) {
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			logger.log(
				'Unrecognized command ' + interaction.commandName,
				WarningLevel.Error,
			);
			return;
		}
		try {
			await command.execute(interaction);
		} catch (err: any) {
			logger.log(err, WarningLevel.Error);
			await interaction.reply({
				content: 'There was an error while executing that command.',
				ephemeral: true,
			});
		}
	} else {
		// fall back to external interaction handlers
		interactionCallbacks.every(async cb => {
			try {
				return !(await cb(interaction));
			} catch (err: any) {
				logger.log(err, WarningLevel.Error);
				return false;
			}
		});
	}
});

///
/// messages
///

type MessageCallback = (message: Message<boolean>) => Promise<void>;

let messageCallbacks: MessageCallback[] = [];

export function registerMessageListener(listener: MessageCallback) {
	messageCallbacks.push(listener);
}

client.on('messageCreate', async msg => {
	if (!client.user || msg.author.id == client.user.id) return;

	if (msg.partial) {
		msg = await msg.fetch();
	}

	messageCallbacks.forEach(cb => {
		try {
			cb(msg);
		} catch (err: any) {
			logger.log('Exception thrown handling message', WarningLevel.Error);
			logger.log(err, WarningLevel.Error);
		}
	});

	modules.forEach(mod => {
		try {
			if (mod.onMessageSend) mod.onMessageSend(msg);
		} catch (err: any) {
			logger.log(
				'Exception thrown handling message in module ' + mod.name,
				WarningLevel.Error,
			);
			logger.log(err, WarningLevel.Error);
		}
	});
});

///
/// reactions
///

type ReactionCallback = (reaction: MessageReaction) => Promise<void>;

let reactionCallbacks: ReactionCallback[] = [];

export function registerReactionListener(listener: ReactionCallback) {
	reactionCallbacks.push(listener);
}

client.on('messageReactionAdd', async react => {
	if (react.me) return;

	if (react.partial) {
		react = await react.fetch();
	}

	reactionCallbacks.forEach(cb => {
		try {
			cb(react as MessageReaction);
		} catch (err: any) {
			logger.log('Exception thrown handling reaction', WarningLevel.Error);
			logger.log(err, WarningLevel.Error);
		}
	});
});

// get everything started

client.login(token);
