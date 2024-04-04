import type { ChatInputCommandInteraction, Client, Message } from "discord.js";
import { Logger, WarningLevel } from "./logger";
import type { MoronModule } from "./moronmodule";
import {
	type StringMatch,
	doesMatch,
	stringSet,
	getEarliestMatch,
	getLastMatch,
	readCacheFileAsJson,
	writeCacheFileAsJson,
} from "./util";
import { serverLog } from "../groche-channels.json";

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

async function chatty_onMessageSend(msg: Message) {
	if (!client || !client.user) {
		logger.log(
			"Message received when no client instance was set!",
			WarningLevel.Error,
		);
		return;
	}

	if (devMode) {
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
	}

	if (
		smartReply(
			msg,
			[
				(topic) => `${topic} can go pretty fast id say`,
				(topic) => `${topic} can barely move`,
				(topic) => `${topic} cant go fast enough`,
				(topic) => `${topic} is the slowest thing i have ever seen`,
				(topic) =>
					`why do you want to know how fast ${topic} can go, are u racing`,
				(topic) => `idk but i can go faster than ${topic} for sure`,
				(topic) => `${topic} is faster than ur mom`,
			],
			stringSet(
				[
					"how fast can",
					"how quickly can",
					"how rapidly can",
					"how fast is",
					"how quick is",
					"how rapid is",
					"how fast does",
					"how quickly does",
					"how rapidly does",
				],
				true,
				true,
			),
			stringSet(["go", "run", "move", "execute", "progress"], true, true),
		)
	) {
		return;
	}
	if (
		smartReply(
			msg,
			[
				(topic) =>
					`everyone always asks "what is ${topic}" but nobody ever asks "how is ${topic}"`,
			],
			stringSet(["what is", "whats"], true, true),
			[],
		)
	) {
		return;
	}
	if (
		smartReply(
			msg,
			[
				(topic) => `wtf i love ${topic} now`,
				(topic) =>
					`ur making me seriously consider ${topic} for the first time`,
				(topic) => `thats how u say ${topic} in my native language`,
			],
			stringSet(["peepee", "poopoo"], true, true),
			stringSet(["peepee", "poopoo"], true, true),
			true,
			true,
		)
	) {
		return;
	}
	if (
		smartReply(
			msg,
			[
				(topic) => `well, i hate ${topic}`,
				(topic) => `${topic}? really?`,
				(topic) => `${topic} is gay as fuck`,
				(topic) => `${topic} is like, _fine_, but you can do so much better`,
				(topic) => `${topic} is pretty based ngl`,
				(topic) => `${topic} do be kinda be wildin doe`,
				(topic) =>
					`my lawyers have advised me to cease contact with ${topic}, sorry`,
			],
			stringSet(
				["love", "liked", "adore", "enjoy", "appreciate", "i like"],
				true,
				true,
			),
			[],
		)
	) {
		return;
	}
	if (
		smartReply(
			msg,
			[
				(topic) => `yeah? you're ${topic} retarded`,
				(topic) => `oh really? you're ${topic} cute`,
				(topic) =>
					`ok but you are ${topic} wrong so put that in your pipe and smoke it`,
				(_topic) => "and?",
			],
			stringSet(["you are", "youre"], true, true),
			stringSet(
				[
					"wrong",
					"retarded",
					"stupid",
					"dumb",
					"bad",
					"evil",
					"gay",
					"right",
					"good",
					"cute",
					"sick",
				],
				true,
				true,
			),
		)
	) {
		return;
	}
	if (
		smartReply(
			msg,
			[
				(topic) => `too bad ur getting more ${topic} whether u like it or not`,
				(topic) => `i love ${topic}`,
				(topic) => `i hate ${topic} too`,
				(topic) =>
					`ur problems with ${topic} are likely a product of problems at home`,
				(topic) => `ngl u kinda got me thinking about ${topic} now`,
				(topic) => `for someone who hates ${topic} u sure have a lot in common`,
			],
			stringSet(
				[
					"i hate",
					"i despise",
					"i cannot stand",
					"i cant stand",
					"i cant deal with",
					"i am sick of",
				],
				true,
				false,
			),
			[],
			true,
			false,
			true,
		)
	) {
		return;
	}
	if (
		smartReply(
			msg,
			[
				(_topic) => "placeholder1",
				(_topic) => "placeholder2",
				(_topic) => "placeholder3",
			],
			stringSet(["test1", "test2"], true, true),
			stringSet(["test3", "test4"], true, true),
		)
	) {
		return;
	}
	if (msg.content.length > 1000) {
		basicReplyFunction([
			"broo thats so many words",
			"jesse what the fuck are you talking about",
			"id put that on my tombstone but it wouldnt fit. it would probably fit on your moms though",
			"i think i understood the first couple of words",
			"https://tenor.com/view/talking-old-weird-crazy-mocking-gif-16113842",
			"too long, did read",
			"please, continue",
			"have you considered getting into creative writing",
			"i dont actually have enough RAM to store this message",
			"i asked chatgpt to respond to this for me but it said token limit exceeded",
			"say that again but in pirate speak",
			"https://tenor.com/view/subway-surfer-gif-6241925",
		])(msg);
	} else if (msg.content.length > 200) {
		basicReplyFunction([
			"thats a lotta words",
			"tldr",
			"leftist memes be like",
			"https://tenor.com/view/he-is-speaking-guy-explaining-with-a-whiteboard-some-guy-explaining-gif-19593300",
			"can you just give me the executive summary im lost",
			"you should submit this to the new york times",
			"can you repeat that i wasnt paying attention",
			"sorry that happened",
			"happy for u",
			"this message would not fit in a tweet",
		])(msg);
	} else {
		if (
			simpleChatTriggers.every((trigger) => {
				if (
					triggerIfMsgContains(
						msg,
						trigger.triggers,
						basicReplyFunction(trigger.replies),
					)
				) {
					// break on first match
					return false;
				}
				return true;
			})
		) {
			// proceed to check complex triggers (TODO)
		} else {
			return;
		}
	}
}
