import type { ChatInputCommandInteraction, Client, Message } from "discord.js";
import { Logger, WarningLevel } from "./logger";
import {
	doesMatch,
	emoteNameToId,
	getEmote,
	messageMentions,
	readCacheFileAsJson,
	writeCacheFile,
} from "./util";
import type { MoronModule } from "./moronmodule";

let client: Client;

const logger: Logger = new Logger("reactor", WarningLevel.Warning);

export const Reactor: MoronModule = {
	name: "reactor",
	onInit: reactor_init,
	onMessageSend: reactor_onMessageSend,
};

let reactions: ReactTrigger[];

function updateCache() {
	const possibleEmojis: string[] = [...new Set(reactions.map((r) => r.emoji))];

	const emojiIndex: { [key: string]: (ReactCondition | string)[] } = {};

	for (const emoji of possibleEmojis) {
		const matches = reactions.filter((reaction) => reaction.emoji === emoji);
		for (const match of matches) {
			const alreadyDefined = Object.hasOwn(emojiIndex, match.emoji);
			if (!alreadyDefined) {
				emojiIndex[match.emoji] = [];
				emojiIndex[match.emoji].push(
					(match.ignoreCase === undefined || match.ignoreCase === true) &&
						(match.ignoreSymb === undefined || match.ignoreSymb === true)
						? match.word
						: {
								word: match.word,
								ignoreCase: match.ignoreCase,
								ignoreSymb: match.ignoreSymb,
							},
				);
			} else {
				emojiIndex[match.emoji].push(
					(match.ignoreCase === undefined || match.ignoreCase === true) &&
						(match.ignoreSymb === undefined || match.ignoreSymb === true)
						? match.word
						: {
								word: match.word,
								ignoreCase: match.ignoreCase,
								ignoreSymb: match.ignoreSymb,
							},
				);
			}
		}
	}

	writeCacheFile(
		"reactor.json",
		Buffer.from(JSON.stringify(emojiIndex, null, "\t")),
	);
}

async function reactor_init(clientInstance: Client) {
	client = clientInstance;

	// load reaction triggers
	reactions = [];
	const loadedReactions = readCacheFileAsJson("reactor.json");
	if (!loadedReactions) {
		logger.log("Failed to load reaction list", WarningLevel.Error);
	} else {
		for (const emoji in loadedReactions) {
			for (const trigger of loadedReactions[emoji]) {
				if (typeof trigger === "string") {
					reactions.push({ emoji: emoji, word: trigger });
				} else {
					reactions.push({
						emoji: emoji,
						word: trigger.word,
						ignoreCase: trigger.ignoreCase,
						ignoreSymb: trigger.ignoreSymb,
					});
				}
			}
		}
	}
}

async function reactWithEmoji(
	msg: Message,
	emojiName: string,
): Promise<boolean> {
	const emoji = await getEmote(msg.guild, emoteNameToId(emojiName));
	if (emoji) {
		msg.react(emoji);
		return true;
	}
	logger.log(`Unable to get emoji ${emojiName}`, WarningLevel.Error);
	return false;
}

function emojiBuzzword(
	msg: Message,
	word: string,
	emoji: string,
	ignoreSymb = true,
	ignoreCase = true,
): boolean {
	if (
		doesMatch(msg.content, {
			match: word,
			ignoreCapitalization: ignoreCase,
			ignorePunctuation: ignoreSymb,
		})
	) {
		if (messageMentions(msg, client.user) || Math.random() < 0.2) {
			logger.log(
				`reacting to message with ${emoji} because it contains ${word}`,
			);
			reactWithEmoji(msg, emoji);
		}
		return true;
	}
	return false;
}

function asciiBuzzword(
	msg: Message,
	word: string,
	emoji: string,
	ignoreSymb = true,
	ignoreCase = true,
): boolean {
	if (
		doesMatch(msg.content, {
			match: word,
			ignoreCapitalization: ignoreCase,
			ignorePunctuation: ignoreSymb,
		})
	) {
		if (messageMentions(msg, client.user) || Math.random() < 0.2) {
			logger.log(
				`reacting to message with ${emoji} because it contains ${word}`,
			);
			msg.react(emoji);
		}
		return true;
	}
	return false;
}

interface ReactCondition {
	word: string;
	ignoreSymb?: boolean;
	ignoreCase?: boolean;
}

interface ReactTrigger {
	word: string;
	emoji: string;
	ignoreSymb?: boolean;
	ignoreCase?: boolean;
}

function addNewReact(
	emoji: string,
	word: string,
	ignoreCapitalization?: boolean,
	ignorePunctuation?: boolean,
) {
	reactions.push({
		emoji: emoji,
		word: word,
		ignoreCase: ignoreCapitalization,
		ignoreSymb: ignorePunctuation,
	});
}

export async function registerNewReaction(
	interaction: ChatInputCommandInteraction,
) {
	const checkSplit =
		interaction.options.getBoolean("ignore_punctuation") ?? true;
	// verify trigger (must be unique)
	const word = interaction.options.getString("text", true);

	let words: string[] = [];
	if (checkSplit) {
		words = word.split(",");
		if (
			!reactions.every((trigger) => words.every((wrd) => wrd !== trigger.word))
		) {
			await interaction.reply("you lost me ngl");
			interaction.followUp({
				content:
					"one of the words you provided already triggers a different reaction",
				options: { ephemeral: true },
			});
			return;
		}
	} else {
		if (!reactions.every((trigger) => trigger.word !== word)) {
			await interaction.reply("my self esteem isn't THAT low");
			interaction.followUp({
				content: "the word you provided already triggers a different reaction",
				options: { ephemeral: true },
			});
			return;
		}

		words = [word];
	}

	// verify reaction
	const react = interaction.options.getString("react", true).trim();
	// verify react is valid
	try {
		const msg = await interaction.reply("hmmm...");
		const msg2 = await interaction.followUp("let me check");
		if (msg && msg2) {
			if (react.startsWith("<")) {
				if (!(await reactWithEmoji(msg2, react))) {
					await msg2.delete();
					await interaction.editReply(
						"either that react isn't available in this server or it's not a real react in the first place, either way ratio",
					);
				} else {
					await msg2.delete();
					await interaction.editReply("aight, you got it boss");
					logger.log(
						`user ${interaction.user.username} registered new react(s) ${react}`,
					);
					for (const entry of words) {
						addNewReact(
							react,
							entry,
							interaction.options.getBoolean("ignore_capitalization") ??
								undefined,
							interaction.options.getBoolean("ignore_punctuation") ?? undefined,
						);
					}
					updateCache();
				}
			} else {
				await msg2.react(react).catch(async (_err: unknown) => {
					await msg2.delete();
				});
				logger.log(
					`user ${interaction.user.username} registered new react(s) ${react}`,
				);
				await msg2.delete();
				await interaction.editReply("k");

				for (const entry of words) {
					addNewReact(
						react,
						entry,
						interaction.options.getBoolean("ignore_capitalization") ??
							undefined,
						interaction.options.getBoolean("ignore_punctuation") ?? undefined,
					);

					logger.log(`trigger: ${entry}`);
				}
				updateCache();
			}
		} else {
			logger.log("failed to send response", WarningLevel.Error);
		}
	} catch (err: unknown) {
		logger.log(err, WarningLevel.Error);
		interaction.editReply(
			`this bitch tryna make me react with ${react} like thats a real emote`,
		);
	}
}

export function reactor_onMessageSend(msg: Message) {
	if (!client.user) {
		logger.log(
			"Tried to receive message when client was not initialized!",
			WarningLevel.Error,
		);
		return;
	}

	reactions.every((reaction) => {
		!reaction.emoji.startsWith("<")
			? asciiBuzzword(
					msg,
					reaction.word,
					reaction.emoji,
					reaction.ignoreSymb,
					reaction.ignoreCase,
				)
			: emojiBuzzword(
					msg,
					reaction.word,
					reaction.emoji,
					reaction.ignoreSymb,
					reaction.ignoreCase,
				);
		return true;
	});
}
