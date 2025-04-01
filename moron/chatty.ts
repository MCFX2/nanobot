import type { ChatInputCommandInteraction, Client, Message } from "discord.js";
import { serverLog } from "../groche-channels.json";
import { Logger, WarningLevel } from "./logger";
import type { MoronModule } from "./moronmodule";
import {
	type StringMatch,
	doesMatch,
	getEarliestMatch,
	getLastMatch,
	readCacheFileAsJson,
	stringSet,
	writeCacheFileAsJson,
} from "./util";

interface SimpleChatTrigger {
	replies: string[];
	triggers: StringMatch[];
}

let simpleChatTriggers: SimpleChatTrigger[] = [];

// dev mode here makes the bot reply with 100% probability, and makes it only reply in serverLog
const devMode: boolean = false;

const logger: Logger = new Logger(
	"chatty",
	devMode ? WarningLevel.Notice : WarningLevel.Warning,
);

export const Chatty: MoronModule = {
	name: "chatty",
	onInit: chatty_init,
	onMessageSend: chatty_onMessageSend,
};

function triggerIfMsgContains(
	msg: Message,
	triggerStrings: StringMatch[],
	callback: (msg: Message, whichPhrase: string) => void,
): boolean {
	let didTrigger = false;

	triggerStrings.every((match) => {
		if (doesMatch(msg.content, match)) {
			callback(msg, match.match);
			didTrigger = true;
			return false;
		}
		return true;
	});

	return didTrigger;
}

function basicReplyFunction(replyList: string[]): (msg: Message) => void {
	return (msg: Message) => {
		msg.reply({
			content: replyList[Math.floor(Math.random() * replyList.length)],
			allowedMentions: {
				repliedUser: false,
			},
		});
	};
}

function getTopic(
	msg: string,
	beforePhrase?: string,
	afterPhrase?: string,
): string {
	let topic = msg;
	if (beforePhrase && beforePhrase !== "") {
		topic = topic.substring(msg.indexOf(beforePhrase) + beforePhrase.length);
	}
	if (afterPhrase && afterPhrase !== "") {
		topic = topic.substring(0, msg.indexOf(afterPhrase));
	}
	return topic;
}

function getPhraseEnd(msg: string): number {
	let end = msg.length;
	for (const char of ["?", ".", ",", "\n", "\r", "!", ";"]) {
		const newEnd = msg.indexOf(char);
		if (newEnd !== -1 && newEnd < end) {
			end = newEnd;
		}
	}

	return end;
}

function smartReply(
	msg: Message,
	responseBuilders: ((topic: string) => string)[],
	beforePhrases: StringMatch[],
	afterPhrases: StringMatch[],
	stopAtPhraseEnd = true,
	useLastAfterMatch = false,
	swapYouMe = false,
): boolean {
	// find the earliest occurring match
	// this is required in case the begin/end phrases
	// are the same for whatever reason
	const beforeMatch = getEarliestMatch(msg.content, beforePhrases);

	if (beforePhrases.length > 0 && !beforeMatch) return false;

	// now we truncate the message at the end of the matched phrase
	// for the same reason as above, this prevents a match
	// from being double-selected incorrectly
	let truncatedMsg = msg.content;
	if (beforeMatch) {
		truncatedMsg = msg.content.substring(
			beforeMatch.matchedIndex + beforeMatch.matchedString.length,
		);
	}

	// then do the same as above
	const afterMatch = useLastAfterMatch
		? getLastMatch(truncatedMsg, afterPhrases)
		: getEarliestMatch(truncatedMsg, afterPhrases);

	if (afterPhrases.length > 0 && !afterMatch) return false;

	// message contained desired setup strings

	let topic = getTopic(
		msg.content,
		beforeMatch?.matchedString,
		afterMatch?.matchedString,
	).trimStart();
	if (stopAtPhraseEnd) {
		topic = topic.substring(0, getPhraseEnd(topic)).trimEnd();
	}

	if (swapYouMe) {
		topic.replace("you", "me");
	}

	msg.reply({
		content:
			responseBuilders[Math.floor(responseBuilders.length * Math.random())](
				topic,
			),
		options: {
			allowedMentions: {
				repliedUser: false,
			},
		},
	});

	return true;
}

function commitChatTriggers() {
	writeCacheFileAsJson("simpleChatTriggers.json", simpleChatTriggers);
}

export function registerSimpleChatTrigger(
	interact: ChatInputCommandInteraction,
) {
	const triggers = interact.options.getString("triggers", true).split(",");
	const responses = interact.options.getString("responses", true).split(",");

	const punctuationOption = interact.options.getBoolean(
		"ignore_punctuation",
		false,
	);

	const ignoreSpecial = punctuationOption === null ? true : punctuationOption;

	const capOption = interact.options.getBoolean("ignore_capitalization", false);
	const ignoreCap = capOption === null ? true : capOption;

	const append = interact.options.getString("append", false);

	if (append) {
		const targetTrigger = simpleChatTriggers.find((trigger) => {
			return trigger.triggers.some((smatch) => {
				return doesMatch(append, smatch);
			});
		});

		if (!targetTrigger) {
			interact.reply({
				content:
					"broo you are so full of shit you cant even append to a trigger that doesn't exist",
				ephemeral: true,
			});
			return;
		}

		// append targetTrigger
		// filter empty responses
		const usableResponses = responses.filter((response) => response.length > 0);
		if (usableResponses.length > 0) {
			targetTrigger.replies.push(...usableResponses);
		}

		// filter empty triggers (in case of stray commas)
		const usableTriggers = triggers.filter((trigger) => trigger.length > 0);

		if (usableTriggers.length > 0) {
			targetTrigger.triggers.push(
				...stringSet(usableTriggers, ignoreSpecial, ignoreCap),
			);
		}

		commitChatTriggers();

		interact.reply({
			content: "ok then",
			ephemeral: true,
		});

		return;
	}

	// build new reply object
	// don't allow empty triggers
	const usableTriggers = triggers.filter((trigger) => trigger.length > 0);
	if (usableTriggers.length !== triggers.length) {
		interact.reply({
			content: "you cannot have empty triggers, bucko. try again",
			ephemeral: true,
		});
		return;
	}

	// don't allow empty responses
	const usableResponses = responses.filter((response) => response.length > 0);
	if (usableResponses.length !== responses.length) {
		interact.reply({
			content: "you cannot have empty responses, bucko. try again",
			ephemeral: true,
		});
		return;
	}

	// build stringmatch objects
	const triggerMatches = stringSet(usableTriggers, ignoreSpecial, ignoreCap);

	simpleChatTriggers.push({
		replies: usableResponses,
		triggers: triggerMatches,
	});

	commitChatTriggers();

	interact.reply({
		content: "ok then :)",
		ephemeral: true,
	});
}

let client: Client;

async function chatty_init(clientInstance: Client) {
	if (devMode) {
		logger.log("Initialized in dev mode");
	}

	client = clientInstance;

	simpleChatTriggers = readCacheFileAsJson("simpleChatTriggers.json");

	if (!simpleChatTriggers) {
		simpleChatTriggers = [];
	}
}

const thesaurus = require("thesaurus");

async function chatty_onMessageSend(msg: Message) {
	if (!client || !client.user) {
		logger.log(
			"Message received when no client instance was set!",
			WarningLevel.Error,
		);
		return;
	}

	/*if (devMode) {
		if (msg.channelId !== serverLog) {
			return;
		}
	} else {
		if (!msg.mentions.has(client.user) && Math.random() > 0.05) {
			return;
		}

		if (msg.channel.isDMBased()) {
			return; // avoid colliding with storykeeper
		}
	}*/

	// april fools 2025
	// replace all user messages with a thesaurus ified version

	if (msg.channel.isDMBased()) {
		return;
	}

	const text = msg.content;
	const results = [];
	for (const word of text.split(" ")) {
		if (word.includes("@")) {
			// don't thesaurusify mentions
			results.push(word);
			continue;
		}

		// also exclude anything that looks like a link or emoji
		if (word.includes("http") || word.includes(":")) {
			results.push(word);
			continue;
		}

		if (word.includes("<") || word.includes(">")) {
			results.push(word);
			continue;
		}

		if (word.length < 3) {
			results.push(word);
			continue;
		}

		const roll = Math.random();
		// 40% chance to thesaurusify word
		const thesaurusifyChance = 0.5;
		// 25% chance to scramble the word
		const scrambleChance = 0.05;

		if (roll > 1 - thesaurusifyChance) {
			// thesaurusify
			// convert to lower case
			const lexicalWord = word.toLowerCase();
			const thesaurusResults = thesaurus.find(lexicalWord);
			if (thesaurusResults && thesaurusResults.length > 0) {
				// try to preserve the original casing
				// to simplify this logic, check 3 characters: first, last, and middle
				let synonym =
					thesaurusResults[Math.floor(Math.random() * thesaurusResults.length)];
				const firstChar = word[0];
				const lastChar = word[word.length - 1];
				const middleChar = word[Math.floor(word.length / 2)];
				if (firstChar === firstChar.toUpperCase()) {
					synonym = synonym[0].toUpperCase() + synonym.substring(1);
				}
				if (lastChar === lastChar.toUpperCase()) {
					synonym =
						synonym.substring(0, synonym.length - 1) +
						synonym[synonym.length - 1].toUpperCase();
				}
				if (middleChar === middleChar.toUpperCase()) {
					// capitalize all letters except the first and last
					synonym =
						synonym[0] +
						synonym.substring(1, synonym.length - 1).toUpperCase() +
						synonym[synonym.length - 1];
				}
				console.log(`replacing '${word}' with '${synonym}'`);
				results.push(synonym);
			} else {
				results.push(word);
			}

			continue;
		}

		if (roll > 1 - thesaurusifyChance - scrambleChance) {
			// randomize the order of all characters except first and last
			const chars = word.split("");
			const firstChar = chars.shift();
			const lastChar = chars.pop();
			chars.sort(() => Math.random() - 0.5);
			const scrambledWord = firstChar + chars.join("") + lastChar;
			results.push(scrambledWord);
			continue;
		}

		results.push(word);
	}

	// send the message in the channel (with a user tag)
	msg.channel.isSendable() &&
		msg.channel.send({
			content: `**${msg.author.username}:** ${results.join(" ")}`,
			// try to preserve the original message's attachments
			files: msg.attachments.map((attachment) => attachment.url),
		});
	msg.delete();

	return;
}
