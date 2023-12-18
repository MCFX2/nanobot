import { Client as TwitterClient } from 'twitter-api-sdk';
import { Client as DiscordClient, Message } from 'discord.js';
import { twitterBearerToken } from '../tokens.json';
import { Logger, WarningLevel } from './logger';
import isUrl from 'is-url';
import { twitterTweetsToTweets } from './util';
import { MoronModule } from './moronmodule';

let discordClient: DiscordClient;
let twitterClient: TwitterClient;

const logger: Logger = new Logger('twitfix', WarningLevel.Notice);

export const TwitFix: MoronModule = {
	name: 'twitfix',
	onInit: twitfix_init,
	onMessageSend: onMessageSend,
};

async function twitfix_init(clientInstance: DiscordClient) {
	discordClient = clientInstance;
	twitterClient = new TwitterClient(twitterBearerToken);

	logger.log('Initialized twitfix');
}

async function handleTweets(msg: Message, postIds: string[]) {
	const { data, includes, errors } = await twitterClient.tweets.findTweetsById({
		ids: postIds,
		'tweet.fields': ['attachments', 'author_id', 'created_at'],
		expansions: ['attachments.media_keys', 'author_id'],
		'media.fields': [
			'alt_text',
			'duration_ms',
			'url',
			'public_metrics',
			'variants',
			'type',
		],
		'user.fields': ['username', 'name', 'profile_image_url', 'id'],
	});

	if (!data) {
		errors?.forEach(e => {
			logger.log(e.title, WarningLevel.Error);
			logger.log(e.detail, WarningLevel.Error);
		});
		logger.log('failed to resolve tweets', WarningLevel.Error);
		return;
	}

	let builtTweets = twitterTweetsToTweets(data, includes);

	let videoFixes: string[] = [];

	builtTweets.forEach(async tweet => {
		logger.log('-----');
		logger.log('tweet: ');
		logger.log('postID: ' + tweet.tweetId);
		logger.log('message: ' + tweet.textContent);
		logger.log(
			'author: ' + tweet.author.name + '(@' + tweet.author.handle + ')',
		);
		logger.log('tweet link: ' + tweet.postUrl);
		tweet.embedVideos.forEach(vid => logger.log(vid));
		tweet.embedImages.forEach(img => logger.log(img));

		if (tweet.embedVideos.length > 0) {
			videoFixes.push(tweet.postUrl.replace('twitter.com', 'vxtwitter.com'));
		}
	});

	if (videoFixes.length > 0) {
		msg.suppressEmbeds(true);

		videoFixes.forEach(async reply => await msg.channel.send(reply));
	}
}

async function onMessageSend(msg: Message) {
	if (!discordClient) {
		logger.log('Discord client not initialized!', WarningLevel.Error);
		return;
	}
	if (!twitterClient) {
		logger.log('Twitter client not initialized!', WarningLevel.Error);
		return;
	}

	// determine if message contains twitter link
	// first split message into words (URLs can't have spaces or newlines)
	let words = msg.content.split('\n').join(' ').split(' ');

	let discoveredTweets: { tweetPath: string; tweetLink: string }[] = [];

	words.forEach(word => {
		// check whether word is a valid URL
		if (isUrl(word)) {
			let parsedUrl = new URL(word);
			// if it and it's from twitter.com, handle it
			if (parsedUrl.hostname === 'twitter.com') {
				discoveredTweets.push({
					tweetPath: parsedUrl.pathname,
					tweetLink: word,
				});
			}
		}
	});

	if (discoveredTweets.length > 0) {
		handleTweets(msg, [
			// remove duplicates
			...new Set(
				discoveredTweets.map(path => {
					// extract the post ID from the path
					return path.tweetPath.substring(path.tweetPath.lastIndexOf('/') + 1);
				}),
			),
		]);
	}
}
