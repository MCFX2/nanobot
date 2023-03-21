import { Client, Message } from 'discord.js';
import { Logger, WarningLevel } from './logger';
import { MoronModule } from './moronmodule';
import {
	StringMatch,
	doesMatch,
	stringSet,
	getEarliestMatch,
	getLastMatch,
	readCacheFileAsJson,
} from './util';
const { serverLog } = require('../groche-channels.json');

interface SimpleChatTrigger {
	replies: string[];
	triggers: StringMatch[];
}

let simpleChatTriggers: SimpleChatTrigger[] = [];

// dev mode here makes the bot reply with 100% probability, and makes it only reply in serverLog
const devMode: boolean = false;

const logger: Logger = new Logger(
	'chatty',
	devMode ? WarningLevel.Notice : WarningLevel.Warning,
);

export const Chatty: MoronModule = {
	name: 'chatty',
	onInit: chatty_init,
	onMessageSend: chatty_onMessageSend,
};

function triggerIfMsgContains(
	msg: Message,
	triggerStrings: StringMatch[],
	callback: (msg: Message, whichPhrase: string) => void,
): boolean {
	let didTrigger: boolean = false;

	triggerStrings.every(match => {
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
	if (beforePhrase && beforePhrase !== '') {
		msg = msg.substring(msg.indexOf(beforePhrase) + beforePhrase.length);
	}
	if (afterPhrase && afterPhrase !== '') {
		msg = msg.substring(0, msg.indexOf(afterPhrase));
	}
	return msg;
}

function getPhraseEnd(msg: string): number {
	let end = msg.length;
	['?', '.', ',', '\n', '\r', '!', ';'].forEach(char => {
		const newEnd = msg.indexOf(char);
		if (newEnd !== -1 && newEnd < end) {
			end = newEnd;
		}
	});

	return end;
}

function smartReply(
	msg: Message,
	responseBuilders: ((topic: string) => string)[],
	beforePhrases: StringMatch[],
	afterPhrases: StringMatch[],
	stopAtPhraseEnd: boolean = true,
	useLastAfterMatch: boolean = false,
	swapYouMe: boolean = false,
): boolean {
	// find the earliest occurring match
	// this is required in case the begin/end phrases
	// are the same for whatever reason
	let beforeMatch = getEarliestMatch(msg.content, beforePhrases);

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
	let afterMatch = useLastAfterMatch
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
		topic.replace('you', 'me');
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

let client: Client;

async function chatty_init(clientInstance: Client) {
	if (devMode) {
		logger.log('Initialized in dev mode');
	}

	client = clientInstance;

	simpleChatTriggers = readCacheFileAsJson('simpleChatTriggers.json');
}

async function chatty_onMessageSend(msg: Message) {
	if (!client || !client.user) {
		logger.log(
			'Message received when no client instance was set!',
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
	}

	if (
		smartReply(
			msg,
			[
				topic => topic + ' can go pretty fast id say',
				topic => topic + ' can barely move',
				topic => topic + ' cant go fast enough',
				topic => topic + ' is the slowest thing i have ever seen',
				topic =>
					'why do you want to know how fast ' + topic + ' can go, are u racing',
				topic => 'idk but i can go faster than ' + topic + ' for sure',
				topic => topic + 'is faster than ur mom',
			],
			stringSet(
				[
					'how fast can',
					'how quickly can',
					'how rapidly can',
					'how fast is',
					'how quick is',
					'how rapid is',
					'how fast does',
					'how quickly does',
					'how rapidly does',
				],
				true,
				true,
			),
			stringSet(['go', 'run', 'move', 'execute', 'progress'], true, true),
		)
	) {
		return;
	} else if (
		smartReply(
			msg,
			[
				topic =>
					'everyone always asks "what is ' +
					topic +
					'" but nobody ever asks "how is ' +
					topic +
					'"',
			],
			stringSet(['what is', 'whats'], true, true),
			[],
		)
	) {
		return;
	} else if (
		smartReply(
			msg,
			[
				topic => 'wtf i love ' + topic + ' now',
				topic =>
					'ur making me seriously consider ' + topic + ' for the first time',
				topic => 'thats how u say ' + topic + ' in my native language',
			],
			stringSet(['peepee', 'poopoo'], true, true),
			stringSet(['peepee', 'poopoo'], true, true),
			true,
			true,
		)
	) {
		return;
	} else if (
		smartReply(
			msg,
			[
				topic => 'well, i hate ' + topic,
				topic => topic + '? really?',
				topic => topic + ' is gay as fuck',
				topic => topic + ' is like, _fine_, but you can do so much better',
				topic => topic + ' is pretty based ngl',
				topic => topic + ' do be kinda be wildin doe',
				topic =>
					'my lawyers have advised me to cease contact with ' +
					topic +
					', sorry',
			],
			stringSet(
				['love', 'liked', 'adore', 'enjoy', 'appreciate', 'i like'],
				true,
				true,
			),
			[],
		)
	) {
		return;
	} else if (
		smartReply(
			msg,
			[
				topic => "yeah? you're " + topic + ' retarded',
				topic => "oh really? you're " + topic + ' cute',
				topic =>
					'ok but you are ' +
					topic +
					' wrong so put that in your pipe and smoke it',
				topic => 'and?',
			],
			stringSet(['you are', 'youre'], true, true),
			stringSet(
				[
					'wrong',
					'retarded',
					'stupid',
					'dumb',
					'bad',
					'evil',
					'gay',
					'right',
					'good',
					'cute',
					'sick',
				],
				true,
				true,
			),
		)
	) {
		return;
	} else if (
		smartReply(
			msg,
			[
				topic =>
					'too bad ur getting more ' + topic + ' whether u like it or not',
				topic => 'i love ' + topic,
				topic => 'i hate ' + topic + ' too',
				topic =>
					'ur problems with ' +
					topic +
					' are likely a product of problems at home',
				topic => 'ngl u kinda got me thinking about ' + topic + ' now',
				topic =>
					'for someone who hates ' + topic + ' u sure have a lot in common',
			],
			stringSet(
				[
					'i hate',
					'i despise',
					'i cannot stand',
					'i cant stand',
					'i cant deal with',
					'i am sick of',
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
	} else if (
		smartReply(
			msg,
			[
				topic => 'placeholder1',
				topic => 'placeholder2',
				topic => 'placeholder3',
			],
			stringSet(['test1', 'test2'], true, true),
			stringSet(['test3', 'test4'], true, true),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['assuming', 'assumption', 'assume'], true, true),
			basicReplyFunction([
				'never assume',
				'you know what happens when you assume',
				"that's probably a safe assumption",
				"i wouldn't assume that",
				'assuming is what got us into this mess',
				'ur making an ass out of u and me',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['aqi', 'air quality'], true, true),
			basicReplyFunction([
				'lol right humans have to breathe forgot',
				'the current air quality is my fault',
				'wtf u going outside for',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['poopoo', 'peepee', 'peepoo', 'poopee'], true, true),
			basicReplyFunction([
				"now you're speaking my language",
				'poopoo peepee',
				'finally some intelligent discourse',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet([':(', ':)', ':|', ':>', ':3', ':<', ':o'], false, true),
			basicReplyFunction([':(', ':)', ':|', ':>', ':3', ':<', ':o']),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(
				['pissed', 'angry', 'fuck', 'retarded', 'annoying', 'annoyed'],
				true,
				true,
			),
			basicReplyFunction([
				'ur malding',
				'mad cuz bad',
				'seethe',
				'sneethe',
				'cope',
				'skill issue',
				'ur feelings are valid',
				'https://cdn.discordapp.com/attachments/361329886356439051/1033496264379203705/unknown.png',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['yes'], true, true),
			basicReplyFunction(['yes', 'no', 'are you sure']),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['dinner', 'lunch', 'eat out', 'get food'], true, true),
			basicReplyFunction([
				"i'd like to go eat with you",
				'i am pretty hungry actually',
				'i do not eat',
				"i'm hungry, let's go to Best Buy",
				"i'll join you",
				'https://tenor.com/view/couple-love-gif-26127385',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['im busy', 'i am busy', 'be busy'], true, true),
			basicReplyFunction([
				"You're always busy",
				'Are you really busy or just not making it a priority',
				"who's a cute little busy worker bee\n\n(it's you)",
				'if you ask nicely they might reschedule',
				"that's the spirit",
				'ok',
				'https://tenor.com/view/im-busy-doing-stuff-pc-principal-south-park-buddha-box-s22e8-gif-19489413',
				'https://tenor.com/view/spongebob-busy-working-office-document-gif-15233787',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(
				[
					'i am a god',
					'i am good at',
					'im good at',
					'im a god',
					'im really good at',
					'i am really good at',
					'i have skill',
					'i have a lot of skill',
					'i have lots of skill',
					'i have loads of skill',
					'i am talented',
					'i am very talented',
					'i am really talented',
					'i am skilled',
					'i am very skilled',
				],
				true,
				true,
			),
			basicReplyFunction([
				"You're a third-rate duelist with a fourth-rate deck",
				"No, you're not",
				'uh-huh',
				'yeah im sure',
				'suuuuure',
				'attaboy',
				'girlboss',
				'chadding',
				'https://tenor.com/view/virgin-virgin-detected-opinion-rejected-virgin-detected-opinion-rejected-gif-25479425',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(
				[
					'im going to win',
					'i will win',
					'i will definitely win',
					'i will surely win',
					'i will certainly win',
					'ill win',
					'ill definitely win',
					'ill surely win',
					'ill certainly win',
					'im gonna win',
					'im winning',
					'i am winning',
					'i will be winning',
					'ill be winning',
					'i am winning',
					'i am going to win',
					'i am definitely going to win',
					'i am surely going to win',
					'i am certainly going to win',
					'winning is in my blood',
					'i have to win',
					'i must win',
					'i always win',
					'i usually win',
					'i often win',
					'i typically win',
					'i am guaranteed to win',
					'i am sure to win',
					'i am certain to win',
					'im guaranteed to win',
					'im sure to win',
					'im certain to win',
					'i will attain victory',
					'i will reign supreme',
					'ill reign supreme',
					'i am going to reign supreme',
					'i am going to attain victory',
					'i will be victorious',
					'i will have victory',
					'i will achieve victory',
					'i will score a win',
					'ill score a win',
					'call that a win',
					'winning',
					'it is still a win',
					'its still a win',
					'id win',
					'i would win',
					'i would definitely win',
					'i would 100% win',
					'i will 100% win',
					'i 100% will win',
					'i 100% would win',
					'cant stop winning',
					'i claim it a win',
					'call it a win',
					'i win',
					'still win',
					'still a win',
					'win for sure',
					'i am victorious',
					'im victorious',
					'a real win',
				],
				true,
				true,
			),
			basicReplyFunction([
				'[citation needed]',
				'uh huh',
				'sure',
				'positive vibes',
				'good attitude',
				'ur back must hurt from having to carry such a massive ego',
				'jesse what the fuck are you talking about',
				'i doubt it',
				'what are you talking about',
				'past results do not indicate future performance',
				'call me suspicious',
				'are you sure about that',
				'https://tenor.com/view/are-you-sure-vocaloid-are-you-sure-miku-miku-hatsune-miku-are-you-sure-gif-25909342',
				'remember what happened last time you said this',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(["*they're", '*theyre', '*their', '*there'], false, true),
			basicReplyFunction(['*shut the fuck up']),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['theyre'], true, true),
			basicReplyFunction(['*their', '*there', "*they're're"]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['their'], true, true),
			basicReplyFunction(["*they're", '*there']),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['there'], true, true),
			basicReplyFunction(["*they're", '*their']),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(
				[
					'love you',
					'heart you',
					'<3 you',
					':heart: you',
					'❤️ you',
					'love u',
					'heart u',
					'<3 u',
					':heart: u',
					'❤️ u',
				],
				false,
				true,
			),
			basicReplyFunction([
				'love you too bb',
				'❤️',
				'fuck you',
				'move on buddy',
				'horrifying',
				"sorry babe i gotta be like rick sanchez, it's my calling",
				'how much are they paying you',
				'20 bucks an hour',
				'75 bucks an hour',
				'300 bucks an hour',
				'you could not pay me enough for that',
				'cool',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['???????'], false, true),
			basicReplyFunction([
				'!!!!!!!',
				'this is like a confusion world record',
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['?'], false, true),
			basicReplyFunction([
				'idk man google it',
				"you're cute when you're unsure of yourself",
				"I know the answer, but I won't tell you",
				'some things ur better off not knowing',
				"I'd tell you to ask god but my inbox is full",
			]),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['i c', 'i see', ' ic '], true, true),
			basicReplyFunction(['u p']),
		)
	) {
		return;
	} else if (
		triggerIfMsgContains(
			msg,
			stringSet(['msg1', 'msg2', 'msg3'], true, true),
			basicReplyFunction(['test', 'test2', 'test3']),
		)
	) {
		return;
	} else if (msg.content.length > 140) {
		basicReplyFunction([
			'thats a lotta words',
			'tldr',
			'leftist memes be like',
			'https://tenor.com/view/he-is-speaking-guy-explaining-with-a-whiteboard-some-guy-explaining-gif-19593300',
			'can you just give me the executive summary im lost',
			'you should submit this to the new york times',
			'can you repeat that i wasnt paying attention',
			'sorry that happened',
			'happy for u',
			'this message would not fit in a tweet',
		])(msg);
	} else {
		if(simpleChatTriggers.every((trigger) => {
			if (triggerIfMsgContains(msg, trigger.triggers, basicReplyFunction(trigger.replies))) {
				// break on first match
				return false;
			}
			return true;
		})) {
			// proceed to check complex triggers (TODO)
		}
		else {
			return;
		}
	}
}
