import {
	Client,
	EmbedBuilder,
	GuildEmoji,
	Message,
	MessageReaction,
	PartialMessage,
	ReactionEmoji,
	TextChannel,
} from 'discord.js';
import { iconicMemes, serverLog } from '../groche-channels.json';
import * as fs from 'fs';
import { Logger, WarningLevel } from './logger';
import {
	StarDBFolder,
	StarDBFile,
	ReactsToTrigger,
} from '../config/stars.json';
import { Error } from './util';
import { MoronModule } from './moronmodule';

/*
	Enables dev mode. Differences:

	- The already-starred DB is not loaded, created, or used.
	- Splash text is guaranteed to appear.
	- Pinned messages go to serverLog instead of iconicMemes
*/

let devMode: boolean = false;

let logger: Logger = new Logger('stars', WarningLevel.Warning);

export const Stars: MoronModule = {
	name: 'stars',
	onInit: stars_init,
	onReactionAdd: stars_onStarAdded,
};

let pinnedMessages: string[] = [];
const pinnedMessagesFile: string = StarDBFolder + StarDBFile;

let pinnedMessagesLoaded: boolean = false;

let clientInstance: Client;

async function stars_init(client: Client) {
	clientInstance = client;

	if (!devMode) {
		// prod-only code
		logger.log('Reading pinned message archive...', WarningLevel.Notice);
		try {
			const data = fs.readFileSync(pinnedMessagesFile, { encoding: 'ascii' });
			data.split('\n').forEach(element => {
				pinnedMessages.push(element);
			});
		} catch (error: any) {
			//create new db file if it does not already exist
			if ((error as Error).code === 'ENOENT') {
				try {
					fs.writeFileSync(pinnedMessagesFile, '');
				} catch (error: any) {
					if ((error as Error).code === 'ENOENT') {
						fs.mkdirSync(StarDBFolder);
						fs.writeFileSync(pinnedMessagesFile, '');
					} else {
						logger.log(error, WarningLevel.Error);
					}
				}
			} else {
				logger.log(error, WarningLevel.Error);
			}
		}

		logger.log('Pinned messages loaded.', WarningLevel.Notice);
	} else {
		logger.log('started in dev mode', WarningLevel.Warning);
	}

	pinnedMessagesLoaded = true;
}

async function addPin(messageId: string): Promise<boolean> {
	if (devMode) {
		return false;
	}

	await pinnedMessagesLoaded;

	//start from end of list for performance
	for (let i = pinnedMessages.length - 1; i >= 0; --i) {
		if (pinnedMessages[i] == messageId) {
			return true;
		}
	}

	pinnedMessages.push(messageId);
	fs.appendFileSync(pinnedMessagesFile, messageId + '\n');

	return false;
}

async function pinMessage(
	client: Client<boolean>,
	reactType: GuildEmoji | ReactionEmoji,
	post: Message<boolean> | PartialMessage,
) {
	// verify it is not already starred and add it to list if not
	if (await addPin(post.id)) return;

	let msgContent = post.content ?? '';
	if (msgContent.length < 1) {
		msgContent = ' ';
	}

	let postEmbed = new EmbedBuilder()
		.setColor('Red')
		.setTitle(`Click here to jump to message`)
		.setURL(post.url)
		.setAuthor({
			name: post.author?.username ?? 'Unknown',
			iconURL:
				post.author?.avatarURL() ??
				'https://cdn.discordapp.com/embed/avatars/5.png',
		})
		.setDescription(msgContent)
		.setFooter({
			text: (reactType.id ? '' : reactType.name + ' ') + getReactText(),
			iconURL: reactType.url ?? undefined,
		})
		.setTimestamp(post.createdTimestamp);

	let additionalAttachments: EmbedBuilder[] = [postEmbed];

	if (post.attachments.size > 0) {
		postEmbed.setImage(post.attachments.first()?.url ?? ' ');

		for (let i = 1; i < post.attachments.size; i++) {
			let nUrl = post.attachments.at(i)?.url;
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
	'bruh moment',
	'why would you do this',
	'i always knew you were like this',
	'freakin epic',
	'i cannot believe this',
	'this is offensive in some countries',
	'wowzers',
	'gaming moment',
	'wonder when this will show up in fortnite',
	'hot',
	'what is wrong with you',
	'what',
	'its like that one thing',
	"remind me not to drink the tap water at jerry garcia's",
	'i am so proud of you',
	'put that in your pipe and smoke it',
	"i don't get this one",
	'if i were real this would hurt',
	'fatherless behavior',
];

function getReactText() {
	return devMode || Math.random() > 0.5
		? reactTexts[Math.floor(Math.random() * reactTexts.length)]
		: ' ';
}
