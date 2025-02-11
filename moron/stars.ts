import * as fs from "node:fs";
import {
	type ApplicationEmoji,
	type Client,
	EmbedBuilder,
	type Guild,
	type GuildEmoji,
	GuildMember,
	type Message,
	type MessageReaction,
	type PartialMessage,
	type ReactionEmoji,
	type TextChannel,
	type User,
} from "discord.js";
import {
	ReactsToTrigger,
	StarDBFile,
	StarDBFolder,
	DisablePoints,
} from "../config/stars.json";
import { bestOfClockwork, testTempChannel } from "../clockwork-channels.json";
import { Logger, WarningLevel } from "./logger";
import type { MoronModule } from "./moronmodule";
import type { FSError } from "./util";

/*
	Enables dev mode. Differences:

	- The already-starred DB is not loaded, created, or used.
	- Splash text is guaranteed to appear.
	- Pinned messages go to serverLog instead of iconicMemes
*/

const devMode = false;

const logger: Logger = new Logger("stars", WarningLevel.Warning);

export const Stars: MoronModule = {
	name: "stars",
	onInit: stars_init,
	onReactionAdd: stars_onStarAdded,
};

const pinnedMessages: string[] = [];
const pinnedMessagesFile: string = StarDBFolder + StarDBFile;

let clientInstance: Client;

async function stars_init(client: Client) {
	clientInstance = client;

	if (!devMode) {
		// prod-only code
		logger.log("Reading pinned message archive...", WarningLevel.Notice);
		try {
			const data = fs.readFileSync(pinnedMessagesFile, { encoding: "ascii" });
			for (const element of data.split("\n")) {
				pinnedMessages.push(element);
			}
		} catch (error: unknown) {
			//create new db file if it does not already exist
			if ((error as FSError).code === "ENOENT") {
				try {
					fs.writeFileSync(pinnedMessagesFile, "");
				} catch (error: unknown) {
					if ((error as FSError).code === "ENOENT") {
						fs.mkdirSync(StarDBFolder);
						fs.writeFileSync(pinnedMessagesFile, "");
					} else {
						logger.log(error, WarningLevel.Error);
					}
				}
			} else {
				logger.log(error, WarningLevel.Error);
			}
		}

		logger.log("Pinned messages loaded.", WarningLevel.Notice);
	} else {
		logger.log("started in dev mode", WarningLevel.Warning);
	}
}

async function addPin(messageId: string): Promise<boolean> {
	if (devMode) {
		return false;
	}

	//start from end of list for performance
	for (let i = pinnedMessages.length - 1; i >= 0; --i) {
		if (pinnedMessages[i] === messageId) {
			return true;
		}
	}

	pinnedMessages.push(messageId);
	fs.appendFileSync(pinnedMessagesFile, `${messageId}\n`);

	return false;
}

async function awardPoint(author: User | null, guild: Guild | null) {
	if (!author || !guild) {
		return;
	}

	const member = await guild.members.fetch(author.id);
	if (!member) {
		return;
	}

	const pointRoles = [
		"849100332855590952", // 1 point
		"849100411566161950", // 2 points
		"849100464297476116", // 3 points
		"849100509969121301", // 4 points
		"849100558475460618", // prize eligible
	];

	// fetch the user's roles
	const memberRoles = member.roles.cache;
	// if the user has the prize role, do nothing
	if (memberRoles.has(pointRoles[4])) return;
	// if user has anything from the list, remove it and give the next one on the list
	let roleAdded = false;
	for (let i = 0; i < pointRoles.length - 1; i++) {
		if (memberRoles.has(pointRoles[i])) {
			await member.roles.remove(pointRoles[i]);
			// don't await this, just move on
			member.roles.add(pointRoles[i + 1]);
			roleAdded = true;
			break;
		}
	}
	if (!roleAdded) {
		// give 1 point if the user has no roles from the list
		// don't await this, just move on
		member.roles.add(pointRoles[0]);
	}
}

async function pinMessage(
	client: Client<boolean>,
	reactType: GuildEmoji | ReactionEmoji | ApplicationEmoji,
	post: Message<boolean> | PartialMessage,
) {
	// verify it is not already starred and add it to list if not
	if (await addPin(post.id)) return;

	let msgContent = post.content ?? "";
	if (msgContent.length < 1) {
		msgContent = " ";
	}

	if (!DisablePoints) {
		awardPoint(post.author, post.guild);
	}

	const postEmbed = new EmbedBuilder()
		.setColor("Red")
		.setTitle("Click here to jump to message")
		.setURL(post.url)
		.setAuthor({
			name: post.author?.username ?? "Unknown",
			iconURL:
				post.author?.avatarURL() ??
				"https://cdn.discordapp.com/embed/avatars/5.png",
		})
		.setDescription(msgContent)
		.setFooter({
			text: (reactType.id ? "" : `${reactType.name} `) + getReactText(),
			iconURL: reactType.imageURL() ?? undefined,
		})
		.setTimestamp(post.createdTimestamp);

	const additionalAttachments: EmbedBuilder[] = [postEmbed];

	if (post.attachments.size > 0) {
		postEmbed.setImage(post.attachments.first()?.url ?? " ");

		for (let i = 1; i < post.attachments.size; i++) {
			const nUrl = post.attachments.at(i)?.url;
			if (nUrl) {
				// sending multiple embeds with the same URL nests them in the same post
				additionalAttachments.push(
					new EmbedBuilder().setURL(post.url).setImage(nUrl),
				);
			}
		}
	}

	const starChannel = client.channels.cache.get(
		devMode ? testTempChannel : bestOfClockwork,
	);
	(starChannel as TextChannel).send({ embeds: additionalAttachments });
}

async function stars_onStarAdded(reaction: MessageReaction) {
	if (reaction.count !== null) {
		if (devMode || reaction.count >= ReactsToTrigger) {
			pinMessage(clientInstance, reaction.emoji, reaction.message);
		}

		if (!reaction.me) {
			if (Math.random() < 0.25) {
				reaction.message.react(reaction.emoji);
			}
		}
	}
}

const reactTexts = [
	"we're so back",
	"it's so over",
	"feels good man",
	"feels bad man",
	"put that in your pipe and smoke it",
	"i don't get it",
	"fatherless",
	"where is juice when you need him",
	"a sentimental piece of trading history",
];

function getReactText() {
	return devMode || Math.random() > 0.6
		? reactTexts[Math.floor(Math.random() * reactTexts.length)]
		: " ";
}
