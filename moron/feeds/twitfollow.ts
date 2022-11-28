import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CacheType,
	ChatInputCommandInteraction,
	Client as DiscordClient,
	ComponentType,
	EmbedBuilder,
	Interaction,
	Message,
	MessageComponentInteraction,
	TextChannel,
} from 'discord.js';
import { Logger, WarningLevel } from '../logger';

import {
	TwitterApi,
	TwitterApiReadOnly,
	TweetUserTimelineV2Paginator,
} from 'twitter-api-v2';

import { twitterBearerToken } from '../../tokens.json';
import {
	getDiscordEmbedsFromImageTweet,
	isUrlDomain,
	readCacheFileAsJson,
	Tweet,
	writeCacheFile,
} from '../util';
import { MoronModule } from '../moronmodule';

let discordClient: DiscordClient;
let twitterClient: TwitterApiReadOnly;

const logger: Logger = new Logger('feeds/twitfollow', WarningLevel.Notice);

export const TwitFollow: MoronModule = {
	name: 'twitfollow',
	onInteract: twitfollow_interactionCreate,
};

type TweetType = 'text' | 'video' | 'photo' | 'animated_gif';

interface FollowSettings {
	lastPost: string;
	channelTarget: string;
	vettingChannel?: string;
	disallowedContentTypes?: TweetType[];
}

let userCache: {
	[key: string]: FollowSettings;
} = {};

function updateCacheFile() {
	writeCacheFile(
		'twitfollow.json',
		Buffer.from(JSON.stringify(userCache, null, '\t')),
	);
}

export async function followUserCommand(
	interaction: ChatInputCommandInteraction,
) {
	const userArg = interaction.options.get('user');
	const targetChannelArg = interaction.options.get('target_channel');
	const vettingChannelArg = interaction.options.get('vetting_channel', false);

	if (!userArg?.value) {
		interaction.reply("don't know what user that is chief");
		return;
	}
	if (!targetChannelArg?.value) {
		interaction.reply("don't know what channel that is chief");
		return;
	}

	let username = userArg.value.toString();
	let targetChannel = targetChannelArg.value.toString();
	let vettingChannel = vettingChannelArg?.value?.toString() ?? undefined;

	if (![...username].every(c => '0123456789'.includes(c))) {
		let twUser = await twitterClient.v2.userByUsername(
			username.startsWith('@') ? username.substring(1) : username,
			{
				'user.fields': ['id'],
			},
		);

		if (twUser.errors) {
			interaction.reply(
				'sorry bud i have no idea who this ' + username + ' guy is',
			);
			return;
		} else {
			username = twUser.data.id;
		}
	}
	followUser(username, '0', targetChannel, vettingChannel);
	interaction.reply('I will follow this fucker until the day i die');
}

export async function unFollowUserCommand(
	interaction: ChatInputCommandInteraction,
) {
	const userArg = interaction.options.get('user');

	if (!userArg?.value) {
		interaction.reply('who tf is that');
		return;
	}

	let username = userArg.value.toString();

	if (username.startsWith('@')) {
		let twUser = await twitterClient.v2.userByUsername(username.substring(1), {
			'user.fields': ['id'],
		});

		if (twUser.errors) {
			interaction.reply(
				'sorry bud i have no idea who this ' + username + ' guy is',
			);
			return;
		} else {
			username = twUser.data.id;
		}
	}
	unfollowUser(username);
	interaction.reply('the chase is off');
}

function followUser(
	userId: string,
	lastPost: string,
	channelTarget: string,
	vettingChannel?: string,
) {
	if (userCache.hasOwnProperty(userId)) return;
	userCache[userId] = {
		lastPost: lastPost,
		channelTarget: channelTarget,
		vettingChannel: vettingChannel,
	};
	updateCacheFile();
}

function unfollowUser(userId: string) {
	if (!userCache.hasOwnProperty(userId)) return;
	delete userCache[userId];
	updateCacheFile();
}

export async function init_twitfollow(clientInstance: DiscordClient) {
	discordClient = clientInstance;
	twitterClient = new TwitterApi(twitterBearerToken).readOnly;

	// load followed users and latest-post info from cache
	let uCache = readCacheFileAsJson('twitfollow.json');

	if (uCache) {
		userCache = uCache;
	} else {
		logger.log(
			'no followed users found, this module will do nothing',
			WarningLevel.Warning,
		);
	}

	logger.log('Initialized twitfollow');
}

function twitterTimelineTweetsToTweets(
	timeline: TweetUserTimelineV2Paginator,
): Tweet[] {
	let builtTweets: Tweet[] = [];
	timeline.tweets.forEach(tweet => {
		let newTweet = new Tweet();

		newTweet.tweetId = tweet.id;
		newTweet.textContent = tweet.text
			.split(' ')
			.map(word => (isUrlDomain(word, 't.co') ? '' : word))
			.filter(e => e.length > 0)
			.join(' ')
			.split('\n')
			.map(word => (isUrlDomain(word, 't.co') ? '' : word))
			.filter(e => e.length > 0)
			.join('\n')
			.trim();

		if (tweet.created_at) {
			newTweet.creationDate = new Date(tweet.created_at);
		}

		if (tweet.attachments) {
			tweet.attachments.media_keys?.forEach(key => {
				let media = timeline.includes.media.find(
					media => media.media_key === key,
				);
				if (media) {
					if (media.type === 'video') {
						if (media.variants) {
							let curBitRate = 0;
							let curUrl = '';
							media.variants.forEach(variant => {
								if (variant.bit_rate) {
									if (variant.bit_rate > curBitRate) {
										curUrl = variant.url;
										curBitRate = variant.bit_rate;
									}
								}
							});

							if (curUrl !== '') {
								const extraParamsLoc = curUrl.lastIndexOf('?');
								newTweet.embedVideos.push(
									extraParamsLoc === -1
										? curUrl
										: curUrl.substring(0, extraParamsLoc),
								);
							}
						}
					} else if (media.type === 'photo') {
						if (media.url) {
							newTweet.embedImages.push(media.url);
						}
					} else if (media.type === 'animated_gif') {
						if (media.variants) {
							newTweet.embedVideos.push(media.variants[0].url);
						}
					} else {
						logger.log('unknown format: ' + media.type, WarningLevel.Warning);
					}
				}
			});
		}

		let userObj = timeline.includes.users.find(
			user => user.id === tweet.author_id,
		);
		if (userObj) {
			newTweet.author.profilePic = userObj.profile_image_url ?? '';
			newTweet.author.handle = userObj.username;
			newTweet.author.name = userObj.name;
		}

		newTweet.author.id = tweet.author_id ?? '0';

		newTweet.postUrl =
			'https://twitter.com/' +
			(newTweet.author.handle === '' ? 'twitter' : newTweet.author.handle) +
			'/status/' +
			tweet.id;

		builtTweets.push(newTweet);
	});

	return builtTweets;
}

async function grabPosts(
	userId: string,
	settings: FollowSettings,
): Promise<Tweet[]> {
	try {
		const rawData = await twitterClient.v2.userTimeline(userId, {
			exclude: ['replies', 'retweets'],
			expansions: ['attachments.media_keys', 'author_id'],
			'media.fields': ['media_key', 'type', 'url', 'variants'],
			'tweet.fields': ['attachments', 'author_id', 'created_at', 'id', 'text'],
			'user.fields': ['id', 'name', 'username', 'profile_image_url'],
			max_results: 5,
			since_id: settings.lastPost,
		});

		if (!rawData.data) {
			rawData.errors?.forEach(e => {
				logger.log(e.title, WarningLevel.Error);
				logger.log(e.detail, WarningLevel.Error);
			});
			logger.log('failed to resolve tweets', WarningLevel.Error);
			return [];
		}

		if (rawData.data.errors) {
			rawData.data.errors.forEach(e => {
				logger.log(e.title, WarningLevel.Error);
				logger.log(e.detail, WarningLevel.Error);
			});
			logger.log('failed to resolve tweets', WarningLevel.Error);
			return [];
		}

		return twitterTimelineTweetsToTweets(rawData);
	} catch (err: any) {
		logger.log(err, WarningLevel.Error);
		return [];
	}
}

async function submitPost(tweet: Tweet, settings: FollowSettings) {
	let candidateChannel: TextChannel = discordClient.channels.resolve(
		settings.channelTarget,
	) as TextChannel;

	if (tweet.embedVideos.length > 0) {
		// video tweet
		candidateChannel.send(
			tweet.postUrl.replace('twitter.com', 'vxtwitter.com'),
		);
	} else if (tweet.embedImages.length > 0) {
		// image tweet
		candidateChannel.send({ embeds: getDiscordEmbedsFromImageTweet(tweet) });
	} else {
		candidateChannel.send({
			embeds: [
				new EmbedBuilder()
					.setDescription(tweet.textContent === '' ? null : tweet.textContent)
					.setAuthor({
						name: tweet.author.name + '(@' + tweet.author.handle + ')',
						iconURL: tweet.author.profilePic,
						url: tweet.postUrl.substring(0, tweet.postUrl.lastIndexOf('/')),
					})
					.setFooter({
						text: 'Twitter',
						iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
					})
					.setTimestamp(tweet.creationDate)
					.setURL(tweet.postUrl),
			],
		});
	}
}

function getTweetType(tweet: Tweet): TweetType {
	if (tweet.embedVideos.length > 0) {
		return 'video';
	} else if (tweet.embedImages.length > 0) {
		return 'photo';
	} else {
		return 'text';
	}
}

async function submitVettingPost(tweet: Tweet, settings: FollowSettings) {
	let candidateChannel: TextChannel = discordClient.channels.resolve(
		settings.vettingChannel!,
	) as TextChannel;

	const tweetType = getTweetType(tweet);

	const vettingOptions = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('twitfollow-accept-' + tweet.tweetId)
			.setLabel('Accept')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('twitfollow-disable-' + tweet.author.id + '-' + tweetType)
			.setLabel('Unsubscribe from ' + tweetType + ' tweets')
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId('twitfollow-reject-' + tweet.tweetId)
			.setLabel('Reject')
			.setStyle(ButtonStyle.Danger),
	);

	if (tweetType === 'video') {
		// video tweet
		candidateChannel.send({
			content:
				`<#${settings.channelTarget}> ` +
				tweet.postUrl.replace('twitter.com', 'vxtwitter.com'),
			components: [vettingOptions],
		});
	} else if (tweetType === 'photo') {
		// image tweet
		candidateChannel.send({
			content: `<#${settings.channelTarget}>`,
			embeds: getDiscordEmbedsFromImageTweet(tweet),
			components: [vettingOptions],
		});
	} else {
		candidateChannel.send({
			content: `<#${settings.channelTarget}>`,
			embeds: [
				new EmbedBuilder()
					.setDescription(tweet.textContent === '' ? null : tweet.textContent)
					.setAuthor({
						name: tweet.author.name + '(@' + tweet.author.handle + ')',
						iconURL: tweet.author.profilePic,
						url: tweet.postUrl.substring(0, tweet.postUrl.lastIndexOf('/')),
					})
					.setFooter({
						text: 'Twitter',
						iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
					})
					.setTimestamp(tweet.creationDate)
					.setURL(tweet.postUrl),
			],
			components: [vettingOptions],
		});
	}
}

function submitCandidate(tweet: Tweet, settings: FollowSettings) {
	if (!settings.vettingChannel) {
		submitPost(tweet, settings);
	} else {
		submitVettingPost(tweet, settings);
	}
}

function manuallyRejectMessage(message: Message) {
	message.delete();
}

async function manuallyAcceptMessage(message: Message) {
	if (message.partial) await message.fetch();
	const spaceChar = message.content.indexOf(' ');
	const embeds = spaceChar === -1 ? message.embeds : undefined;
	const content =
		spaceChar === -1 ? undefined : message.content.substring(spaceChar + 1);

	const targetChannel = discordClient.channels.resolve(
		message.content.substring(
			message.content.indexOf('#') + 1,
			message.content.indexOf('>'),
		),
	) as TextChannel;

	targetChannel.send({ content: content, embeds: embeds });

	message.delete();
}

function disableType(user: string, tweetType: TweetType) {
	const userEntry = userCache[user];
	if (!userEntry) {
		logger.log(
			'tried to disable tweet type of ' +
				tweetType +
				' for not-subscribed user ' +
				user,
			WarningLevel.Warning,
		);
		return;
	}

	if (!userEntry.disallowedContentTypes) {
		userEntry.disallowedContentTypes = [];
	}

	if (userEntry.disallowedContentTypes.includes(tweetType)) return;
	userEntry.disallowedContentTypes.push(tweetType);

	if (userEntry.disallowedContentTypes.length === 4) {
		// all media types disabled
		unfollowUser(user);
	} else {
		updateCacheFile();
	}
}

// expects args to be in the form of 'userid-tweetype'
// example: 1466605444-text
// only for the interact button, outside of that use disableType() instead
function disableButton(args: string) {
	const separator = args.indexOf('-');
	const author = args.substring(0, separator);
	const tweetType = args.substring(separator + 1);
	disableType(author, tweetType as TweetType);
}

function twitfollow_interactionCreate(
	interaction: Interaction<CacheType>,
): boolean {
	if (interaction.isMessageComponent()) {
		const interact = interaction as MessageComponentInteraction;
		if (interact.componentType === ComponentType.Button) {
			if (interact.customId.startsWith('twitfollow-')) {
				const subcommand = interact.customId.substring('twitfollow-'.length);
				if (subcommand.startsWith('accept-')) {
					manuallyAcceptMessage(interact.message);
				} else if (subcommand.startsWith('reject-')) {
					manuallyRejectMessage(interact.message);
				} else if (subcommand.startsWith('disable-')) {
					disableButton(subcommand.substring(subcommand.indexOf('-') + 1));
				} else {
					logger.log('unknown subcommand: ' + subcommand, WarningLevel.Warning);
				}
				return true;
			}
			return false;
		}
		return false;
	}
	return false;
}

export async function check_twitfollow() {
	let updateCache: boolean = false;
	for (const user in userCache) {
		if (Object.prototype.hasOwnProperty.call(userCache, user)) {
			const element = userCache[user];
			const tweets = await grabPosts(user, element);
			let maxId = element.lastPost;
			tweets.forEach(tweet => {
				if (tweet.tweetId > maxId) {
					maxId = tweet.tweetId;
				}
				const tweetType = getTweetType(tweet);
				if (element.disallowedContentTypes) {
					if (
						element.disallowedContentTypes.every(type => type !== tweetType)
					) {
						submitCandidate(tweet, element);
					}
				} else {
					submitCandidate(tweet, element);
				}
			});

			if (maxId !== element.lastPost) {
				userCache[user].lastPost = maxId;
				updateCache = true;
			}
		}
	}

	if (updateCache) {
		updateCacheFile();
	}
}
