import {
	ActivityType,
	Client,
	Collection,
	GatewayIntentBits,
	type Interaction,
	Partials,
	REST,
	Routes,
	type SlashCommandBuilder,
} from "discord.js";
import { token, clientID } from "./tokens.json";
import { Logger, WarningLevel } from "./moron/logger";
import { Chatty } from "./moron/chatty";
import { Reactor } from "./moron/reactor";
import { daily_init } from "./moron/daily";
import { Stars } from "./moron/stars";
import * as path from "node:path";
import * as fs from "node:fs";
import type { MoronModule } from "./moron/moronmodule";
import { Bard } from "./moron/bard";
import { MMO } from "./moron/mmo/mmo";

export class ExtendedClient extends Client {
	commands: Collection<
		string,
		{
			data: SlashCommandBuilder;
			execute: (interaction: Interaction) => Promise<void>;
		}
	> = new Collection();
}

const logger: Logger = new Logger("core", WarningLevel.Notice);
logger.log("Bot starting...");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.DirectMessages,
	],
	presence: {
		activities: [{ name: "your mom", type: ActivityType.Competing }],
		status: "dnd",
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

function getAllCommands(directory: string) {
	let commandFiles: string[] = [];
	for (const file of fs.readdirSync(directory)) {
		if (file.startsWith("_")) {
			return;
		}
		const abs = path.join(directory, file);
		if (fs.statSync(abs).isDirectory()) {
			const extraCommands = getAllCommands(abs);
			if (extraCommands) {
				commandFiles = commandFiles.concat(extraCommands);
			}
		} else if (abs.endsWith(".ts")) {
			commandFiles.push(abs);
		}
		return;
	}
	return commandFiles;
}

function loadAllCommands() {
	const rest = new REST().setToken(token);
	const commandFiles = getAllCommands("moron/commands/");

	if (!commandFiles) {
		logger.log("Failed to load commands", WarningLevel.Error);
		return;
	}

	const commandBlobs: string[] = [];

	for (const file of commandFiles) {
		const command = require(`${__dirname}/${file}`);

		if ("data" in command && "execute" in command) {
			client.commands.set(command.data.name, command);
			commandBlobs.push(command.data.toJSON());
		} else {
			logger.log(`Unrecognized command in file ${file}`, WarningLevel.Warning);
		}
	}

	rest
		.put(Routes.applicationCommands(clientID), {
			body: commandBlobs,
		})
		.then(() => {
			logger.log(
				`Successfully registered ${commandBlobs.length} commands`,
				WarningLevel.Notice,
			);
		})
		.catch((err) => {
			logger.log("Failed to register commands", WarningLevel.Error);
			logger.log(err, WarningLevel.Error);
		});
}

loadAllCommands();

// init modules

const modules: MoronModule[] = [Reactor, Chatty, Stars, Bard, MMO];

type InitCallback = (client: Client) => Promise<void>;

const initCallbacks: InitCallback[] = [daily_init];

client.once("ready", async () => {
	// init modules
	await Promise.allSettled(
		initCallbacks.map((cb) => {
			try {
				cb(client);
			} catch (err: unknown) {
				logger.log(
					`Exception thrown when initializing module ${cb.name}`,
					WarningLevel.Error,
				);
				logger.log(err, WarningLevel.Error);
			}
		}),
	);

	await Promise.allSettled(
		modules.map((mod) => {
			try {
				if (mod.onInit) mod.onInit(client);
			} catch (err: unknown) {
				logger.log(
					`Exception thrown when initializing module ${mod.name}`,
					WarningLevel.Error,
				);
				logger.log(err, WarningLevel.Error);
			}
		}),
	);
	// all done

	logger.log("Bot started");
});

///
/// commands
///

client.on("interactionCreate", async (interaction) => {
	if (interaction.isChatInputCommand()) {
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			logger.log(
				`Unrecognized command ${interaction.commandName}`,
				WarningLevel.Error,
			);
			return;
		}
		try {
			await command.execute(interaction);
		} catch (err: unknown) {
			logger.log(err, WarningLevel.Error);
			await interaction.reply({
				content: "something is FUCKED UP here, dude (internal error)",
				ephemeral: true,
			});
		}
	} else {
		// fall back to external interaction handlers
		modules.every((mod) => {
			try {
				if (mod.onInteract) {
					return !mod.onInteract(interaction);
				}
				return true;
			} catch (err: unknown) {
				logger.log(
					`exception thrown handling interaction in module ${mod.name}`,
					WarningLevel.Error,
				);
				logger.log(JSON.stringify(err), WarningLevel.Error);
				return false;
			}
		});
	}
});

///
/// messages
///

client.on("messageCreate", async (msg) => {
	if (!client.user || msg.author.id === client.user.id) return;

	const fullMsg = msg.partial ? await msg.fetch() : msg;

	for (const mod of modules) {
		try {
			if (mod.onMessageSend) mod.onMessageSend(fullMsg);
		} catch (err: unknown) {
			logger.log(
				`Exception thrown handling message in module ${mod.name}`,
				WarningLevel.Error,
			);
			logger.log(err, WarningLevel.Error);
		}
	}
});

///
/// reactions
///

client.on("messageReactionAdd", async (react, user) => {
	if (react.me) return;

	const fullReact = react.partial ? await react.fetch() : react;
	const fullUser = user.partial ? await user.fetch() : user;

	for (const module of modules) {
		try {
			if (module.onReactionAdd) {
				module.onReactionAdd(fullReact, fullUser);
			}
		} catch (err: unknown) {
			logger.log("Exception thrown handling reaction add", WarningLevel.Error);
			logger.log(err, WarningLevel.Error);
		}
	}
});

client.on("messageReactionRemove", async (react) => {
	if (react.me) return;

	const fullReact = react.partial ? await react.fetch() : react;

	for (const module of modules) {
		try {
			if (module.onReactionRemove) {
				module.onReactionRemove(fullReact);
			}
		} catch (err: unknown) {
			logger.log(
				"Exception thrown handling reaction removal",
				WarningLevel.Error,
			);
			logger.log(err, WarningLevel.Error);
		}
	}
});

// get everything started

client.login(token);
