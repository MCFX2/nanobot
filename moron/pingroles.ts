import type { Client, Message, MessageReaction, User } from "discord.js";
import type { MoronModule } from "./moronmodule";
import { readCacheFileAsJson, writeCacheFileAsJson } from "./util";
import { Logger, WarningLevel } from "./logger";

interface PingRoleConfig {
	roles: {
		emojiId: string;
		roleId: string;
	}[];

	messageId: string;
}

const reactChannelId = "500314446229667860";

let config: PingRoleConfig;
let client: Client;
let enabled = false;

export const PingRole: MoronModule = {
	name: "pingrole",
	onInit: pingrole_init,
	onReactionAdd: pingrole_react,
	onReactionRemove: pingrole_unreact,
};

const logger = new Logger("pingrole", WarningLevel.Notice);

async function pingrole_init(newClient: Client) {
	config = readCacheFileAsJson("pingrole.json");
	client = newClient;

	if (!config) {
		logger.log("no pingrole config found, creating new one");
		// send role message
		const channel = await client.channels.fetch(reactChannelId);
		if (!channel) {
			logger.log(
				`Could not find channel with ID ${reactChannelId}`,
				WarningLevel.Error,
			);
			return;
		}

		if (!channel.isTextBased()) {
			logger.log(
				`Channel with ID ${reactChannelId} is not a text channel`,
				WarningLevel.Error,
			);
			return;
		}

		const msg = await channel.send(
			`react with one of the reactions below to opt in for pings
<:smugseth:1249430659496411186>  Realm of the liberals
<:sethcp:926675923833614397> Realm of the liberals (after hours)
<:bonz:355857939329974282> Groche Gaming
<:camaro:446291688122482689> Realm of the living`,
		);

		config = {
			roles: [
				{
					emojiId: "1249430659496411186",
					roleId: "1207525850791022612",
				},
				{
					emojiId: "926675923833614397",
					roleId: "1261829991612547093",
				},
				{
					emojiId: "355857939329974282",
					roleId: "1261829943323787304",
				},
				{
					emojiId: "446291688122482689",
					roleId: "1261829875593908224",
				},
			],
			messageId: msg.id,
		};

		for (const role of config.roles) {
			const emoji = await msg.react(role.emojiId);
			if (!emoji) {
				logger.log(
					`Could not find emoji with ID ${role.emojiId}`,
					WarningLevel.Error,
				);
			}
		}

		writeCacheFileAsJson("pingrole.json", config);
	}

	enabled = true;
	logger.log("pingrole initialized", WarningLevel.Notice);
}

// make all role members conform to the reactions on the given message
async function fixRoles(message: Message) {
	logger.log("updating role info...", WarningLevel.Notice);

	const guild = message.guild;
	if (!guild) {
		logger.log("Could not find guild for message", WarningLevel.Error);
		return;
	}

	const reactions = message.reactions.cache;

	for (const r of config.roles) {
		const guildRole = await guild.roles.fetch(r.roleId);
		if (!guildRole) {
			logger.log(
				`Encountered unknown role ID ${r.roleId} when fetching roles`,
				WarningLevel.Warning,
			);
			continue;
		}

		// check members of the role
		const members = guildRole.members;
		const reaction = reactions.get(r.emojiId);

		for (const [id, _member] of members) {
			// check if the member has reacted
			if (
				!reaction ||
				!(
					reaction.users.cache.get(id) ?? (await reaction.users.fetch()).has(id)
				)
			) {
				const member = members.get(id);
				if (!member) {
					logger.log(
						`Could not find member with ID ${id}`,
						WarningLevel.Warning,
					);
					continue;
				}

				member.roles.remove(guildRole);
			}
		}

		if (!reaction) continue;

		// check for members who have reacted but don't have the role
		const users = await reaction.users.fetch();
		for (const [id, _user] of users) {
			const member =
				guild.members.cache.get(id) ?? (await guild.members.fetch(id));
			if (!member) {
				logger.log(`Could not find member with ID ${id}`, WarningLevel.Warning);
				continue;
			}

			if (!member.roles.cache.has(guildRole.id)) {
				member.roles.add(guildRole);
			}
		}
	}

	logger.log("role info updated", WarningLevel.Notice);
}

async function pingrole_react(react: MessageReaction, user: User) {
	if (!enabled) {
		logger.log(
			"ignoring reaction because pingrole is disabled",
			WarningLevel.Notice,
		);
		return;
	}

	if (react.message.id !== config.messageId) {
		logger.log(
			"ignoring reaction because it's not the pingrole message",
			WarningLevel.Notice,
		);
		return;
	}

	const msg = await react.message.fetch();
	fixRoles(msg);
}

async function pingrole_unreact(react: MessageReaction) {
	if (!enabled) {
		logger.log(
			"ignoring reaction because pingrole is disabled",
			WarningLevel.Notice,
		);
		return;
	}

	if (react.message.id !== config.messageId) {
		logger.log(
			"ignoring reaction because it's not the pingrole message",
			WarningLevel.Notice,
		);
		return;
	}

	const msg = await react.message.fetch();
	fixRoles(msg);
}
