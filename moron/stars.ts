import {
	type Client,
	EmbedBuilder,
	type GuildEmoji,
	type Message,
	type MessageReaction,
	type PartialMessage,
	type ReactionEmoji,
	type TextChannel,
} from "discord.js";
import { iconicMemes, serverLog } from "../groche-channels.json";
import * as fs from "node:fs";
import { Logger, WarningLevel } from "./logger";
import {
	StarDBFolder,
	StarDBFile,
	ReactsToTrigger,
} from "../config/stars.json";
import type { FSError } from "./util";
import type { MoronModule } from "./moronmodule";

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

let pinnedMessagesLoaded = false;

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

	pinnedMessagesLoaded = true;
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

async function pinMessage(
	client: Client<boolean>,
	reactType: GuildEmoji | ReactionEmoji,
	post: Message<boolean> | PartialMessage,
) {
	// verify it is not already starred and add it to list if not
	if (await addPin(post.id)) return;

	let msgContent = post.content ?? "";
	if (msgContent.length < 1) {
		msgContent = " ";
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
		devMode ? serverLog : iconicMemes,
	);
	(starChannel as TextChannel).send({ embeds: additionalAttachments });
}

async function stars_onStarAdded(reaction: MessageReaction) {
	if (reaction.count !== null) {
		if (devMode || reaction.count >= ReactsToTrigger) {
			pinMessage(clientInstance, reaction.emoji, reaction.message);
		}
	}
}

const reactTexts = [
	"this is offensive in some countries",
	"wowzers",
	"gaming moment",
	"hot",
	"what",
	"i am so proud of you",
	"put that in your pipe and smoke it",
	"i don't get this one",
	"fatherless behavior",
	"you are a bad person",
	"you are a good person",
	"wholesome 100",
	"i am going to tell my kids this was how the world ended",
	"you are going to brazil",
	"you are going to horny jail",
	"you are going to jail",
	"been there, done that",
	"can u xplain",
];

function getReactText() {
	return devMode || Math.random() > 0.6
		? reactTexts[Math.floor(Math.random() * reactTexts.length)]
		: " ";
}
