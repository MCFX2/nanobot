import * as fs from 'fs';
import * as settings from '../config/general.json';
import { Logger, WarningLevel } from './logger';
import HtmlParser, { HTMLElement } from 'node-html-parser';
import {
	CategoryChannel,
	DMChannel,
	EmbedBuilder,
	ForumChannel,
	Guild,
	GuildEmoji,
	GuildMember,
	Message,
	NewsChannel,
	PartialDMChannel,
	PartialGroupDMChannel,
	PrivateThreadChannel,
	PublicThreadChannel,
	Role,
	StageChannel,
	TextChannel,
	ThreadMember,
	User as DiscordUser,
	VoiceChannel,
} from 'discord.js';
import isUrl from 'is-url';
import { components } from 'twitter-api-sdk/dist/gen/openapi-types';
///
/// set up logger for util functions
///

const logger: Logger = new Logger('utils', WarningLevel.Warning);

///
/// error override interface so we can get an actual error code
///

//i shouldn't have to do this
export declare interface Error {
	name: string;
	message: string;
	stack?: string;
	code?: number | string;
}

///
/// useful string-matching stuff, for message parsing
///

export class StringMatch {
	match: string = '';
	// ignores any character found in punctuationChars[] for comparison purposes
	ignorePunctuation: boolean = true;
	// converts both this string and whatever it's being compared to lower-case before comparison
	ignoreCapitalization: boolean = true;
}

// creates an array of stringmatches with the corresponding strings, all with the same stringmatch options
export function stringSet(
	matches: string[],
	ignorePunctuation: boolean,
	ignoreCapitalization: boolean,
): StringMatch[] {
	let results: StringMatch[] = [];
	matches.forEach(match => {
		results.push({
			match: match,
			ignorePunctuation: ignorePunctuation,
			ignoreCapitalization: ignoreCapitalization,
		});
	});

	return results;
}

const punctuationChars: string[] = [
	"'",
	'"',
	'.',
	',',
	'_',
	'-',
	'*',
	'&',
	'%',
	'$',
	'#',
	'@',
	'!',
	'`',
];
// not efficient but fast enough for our purposes
export function doesMatch(
	inputString: string,
	testString: StringMatch,
): boolean {
	let cmpString1: string = inputString;
	let cmpString2: string = testString.match;

	if (testString.ignoreCapitalization) {
		cmpString1 = cmpString1.toLowerCase();
		cmpString2 = cmpString2.toLowerCase();
	}

	if (testString.ignorePunctuation) {
		punctuationChars.forEach(char => {
			cmpString1.replace(char, '');
			cmpString2.replace(char, '');
		});
	}

	return cmpString1.includes(cmpString2);
}

// returns the index of the beginning of the match of the specified string
// returns -1 if no match was found
export function whereMatch(
	inputString: string,
	testString: StringMatch,
): number {
	let cmpString1: string = inputString;
	let cmpString2: string = testString.match;

	if (testString.ignoreCapitalization) {
		cmpString1 = cmpString1.toLowerCase();
		cmpString2 = cmpString2.toLowerCase();
	}

	if (testString.ignorePunctuation) {
		punctuationChars.forEach(char => {
			cmpString1.replace(char, '');
			cmpString2.replace(char, '');
		});
	}

	return cmpString1.indexOf(cmpString2);
}

// get the index and candidate that matched a given input string
// this returns the earliest match in the input string out of all candidates
// and returns undefined if no match was found
export function getEarliestMatch(
	inputString: string,
	matchCandidates: StringMatch[],
): { matchedString: string; matchedIndex: number } | undefined {
	let beforeMatch: StringMatch | undefined;
	let beforeMatchPos: number = -1;
	if (matchCandidates.length > 0) {
		matchCandidates.forEach((match: StringMatch) => {
			let matchPos = whereMatch(inputString, match);
			if (matchPos !== -1) {
				if (beforeMatchPos === -1) {
					beforeMatchPos = matchPos;
					beforeMatch = match;
				} else if (beforeMatchPos > matchPos) {
					beforeMatchPos = matchPos;
					beforeMatch = match;
				}
			}
		});
		if (beforeMatch === undefined) return undefined;
		return { matchedString: beforeMatch.match, matchedIndex: beforeMatchPos };
	}
	return undefined;
}

// get the index and candidate that matched a given input string
// this returns the furthest match in the input string out of all candidates
// and returns undefined if no match was found
export function getLastMatch(
	inputString: string,
	matchCandidates: StringMatch[],
): { matchedString: string; matchedIndex: number } | undefined {
	let lastMatch: StringMatch | undefined;
	let lastMatchPos: number = -1;
	if (matchCandidates.length > 0) {
		matchCandidates.forEach((match: StringMatch) => {
			let matchPos = whereMatch(inputString, match);
			if (matchPos !== -1) {
				if (lastMatchPos === -1) {
					lastMatchPos = matchPos;
					lastMatch = match;
				} else if (lastMatchPos < matchPos) {
					lastMatchPos = matchPos;
					lastMatch = match;
				}
			}
		});
		if (lastMatch === undefined) return undefined;
		return { matchedString: lastMatch.match, matchedIndex: lastMatchPos };
	}
	return undefined;
}

///
/// emoji handling stuff
///

export async function getEmote(
	guild: Guild | null,
	emoteId: string,
): Promise<GuildEmoji | undefined> {
	if (!guild) return undefined;

	try {
		return await guild.emojis.fetch(emoteId);
	} catch (err: any) {
		return undefined;
	}
}

// converts <:emote:1234567890> to 1234567890
export function emoteNameToId(emoji: string) {
	return emoji.substring(emoji.lastIndexOf(':') + 1, emoji.length - 1);
}

///
/// cache management simplified
///

function createCacheFile(filename: string) {
	try {
		fs.writeFileSync(settings.cacheDir + filename, '');
	} catch (error: any) {
		if ((error as Error).code === 'ENOENT') {
			fs.mkdirSync(settings.cacheDir);
			fs.writeFileSync(settings.cacheDir + filename, '');
		} else {
			logger.log(error, WarningLevel.Error);
		}
	}
}

export function writeCacheFile(filename: string, contents: Buffer) {
	try {
		fs.writeFileSync(settings.cacheDir + filename, contents);
	} catch (error: any) {
		if ((error as Error).code === 'ENOENT') {
			createCacheFile(filename);
			fs.writeFileSync(settings.cacheDir + filename, contents);
		}
	}
}

// reads the given filename from the configured cache directory
// (default ./db/)
// if the file does not exist, this will create an empty file with the given name and return an empty string
export function readCacheFile(filename: string): Buffer | undefined {
	try {
		return fs.readFileSync(settings.cacheDir + filename);
	} catch (error: any) {
		//create new db file if it does not already exist
		if ((error as Error).code === 'ENOENT') {
			createCacheFile(filename);
		} else {
			logger.log(error, WarningLevel.Error);
		}
		return undefined;
	}
}

// same as readCacheFile but it also parses the result into a JSON object
// returns undefined if the file could not be created or was empty
export function readCacheFileAsJson(filename: string): any {
	let buf = readCacheFile(filename);
	if (!buf) {
		return undefined;
	} else {
		if (buf.length == 0) return undefined;

		try {
			return JSON.parse(buf.toString());
		} catch (err: any) {
			if (err as SyntaxError) {
				// return invalid JSON as undefined
				logger.log(
					'Corrupt or invalid JSON loaded from ' + filename,
					WarningLevel.Warning,
				);
				return undefined;
			} else {
				logger.log(err, WarningLevel.Error);
				return undefined;
			}
		}
	}
}

// same as writeCacheFile but covers the most common use case
// where we want to simply dump the object as-is as a formatted JSON
export function writeCacheFileAsJson(filename: string, contents: any) {
	writeCacheFile(filename, Buffer.from(JSON.stringify(contents, null, '\t')));
}

///
/// RSS parsing convenience
///

export function getSingleElement(
	htmlSource: string | undefined,
	tagName: string,
	errorLogger: Logger,
): HTMLElement | undefined {
	const elements = HtmlParser.parse(htmlSource ?? '< />').getElementsByTagName(
		tagName,
	);

	if (elements.length !== 1) {
		errorLogger.log(
			'Number of elements matching ' +
				tagName +
				' tag was ' +
				elements.length +
				' but we expected one! Did the RSS syntax change?',
			WarningLevel.Error,
		);
		return undefined;
	}
	return elements[0];
}

///
/// Other web utils
///

// returns true if `text` is a link for the given domain (e.g. "discordapp.com")
export function isUrlDomain(text: string, domain: string): boolean {
	if (isUrl(text)) {
		const url = new URL(text);
		if (url.hostname.startsWith('www.')) {
			url.hostname = url.hostname.substring(4);
		}
		if (url.hostname == domain) return true;
		return false;
	}
	return false;
}

///
/// Twitter API
///

// manually specify official twitter api interface because the TS library doesn't have it for some reason
export class User {
	name: string = 'unknown'; // user's display name
	handle: string = ''; // user's @handle
	profilePic: string = ''; // link to user's profile image
	id: string = '0';
}

export class Tweet {
	author: User = new User();
	tweetId: string = '0';
	textContent: string = '';
	creationDate: Date = new Date();

	embedVideos: string[] = []; // list of links to videos contained in tweet
	embedImages: string[] = []; // list of links to images contained in tweet

	postUrl: string = 'about:blank'; // link to the post itself (not empty by default for embed convenience)
}

export interface TweetMediaVariant {
	bit_rate?: number;
	content_type: string;
	url: string;
}
export interface TweetMediaItem {
	//public_metrics: TweetPublicMetrics
	type: string;
	media_key: string;

	variants?: TweetMediaVariant[];
	alt_text?: string;
	width?: number;
	height?: number;
	duration_ms?: number;
	preview_image_url?: string;
	url?: string;
}

// generates a list of embeds (meant to be sent at once) containing the images from a given Tweet
export function getDiscordEmbedsFromImageTweet(tweet: Tweet) {
	let imgEmbeds: EmbedBuilder[] = [];
	tweet.embedImages.forEach(img => {
		imgEmbeds.push(
			new EmbedBuilder()
				.setDescription(tweet.textContent === '' ? null : tweet.textContent)
				.setAuthor({
					name: tweet.author.name + '(@' + tweet.author.handle + ')',
					iconURL: tweet.author.profilePic,
					url: tweet.postUrl.substring(0, tweet.postUrl.lastIndexOf('/')),
				})
				.setImage(img)
				.setURL(tweet.postUrl)
				.setTitle('View on Twitter')
				.setFooter({
					text: 'Twitter',
					iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
				})
				.setTimestamp(tweet.creationDate),
		);
	});

	return imgEmbeds;
}

export function twitterTweetsToTweets(
	tweets: components['schemas']['Tweet'][],
	// postURLs: string[],
	includes: components['schemas']['Expansions'] | undefined,
): Tweet[] {
	let builtTweets: Tweet[] = [];

	tweets.forEach(tweet => {
		let newTweet = new Tweet();

		// post ID is straightforward
		newTweet.tweetId = tweet.id;

		// filter out possible t.co link in tweet text
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

		// set creation date if known
		if (tweet.created_at) {
			newTweet.creationDate = new Date(tweet.created_at);
		}

		// add media embed URLs
		if (includes) {
			if (includes.media) {
				if (tweet.attachments) {
					// attempt to match attachments from includes to tweet
					tweet.attachments.media_keys?.forEach(key => {
						let media = includes.media?.find(
							media => media.media_key == key,
						) as TweetMediaItem;
						if (media) {
							if (media.type === 'video') {
								// find the video variant with the highest bitrate
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
								logger.log(
									'unknown media type: ' + media.type,
									WarningLevel.Warning,
								);
							}
						}
					});
				}
			}

			// fill in author info
			if (includes.users) {
				let userObj = includes.users.find(user => user.id === tweet.author_id);
				if (userObj) {
					newTweet.author.profilePic = userObj.profile_image_url ?? '';
					newTweet.author.handle = userObj.username;
					newTweet.author.name = userObj.name;
					newTweet.author.id = userObj.id;
				}
			}
		}

		// fill in post URL
		newTweet.postUrl =
			'https://twitter.com/' +
			(newTweet.author.handle === '' ? 'twitter' : newTweet.author.handle) +
			'/status/' +
			tweet.id;

		builtTweets.push(newTweet);
	});

	return builtTweets;
}

///
/// messaging
///

export function messageMentions(
	msg: Message,
	user:
		| string
		| DiscordUser
		| Message<boolean>
		| GuildMember
		| ThreadMember
		| Role
		| CategoryChannel
		| DMChannel
		| PartialDMChannel
		| PartialGroupDMChannel
		| NewsChannel
		| StageChannel
		| TextChannel
		| PrivateThreadChannel
		| PublicThreadChannel<boolean>
		| VoiceChannel
		| ForumChannel
		| null,
) {
	if (user === null) return false;

	if (msg.mentions.repliedUser) {
		if (typeof user === 'string') {
			if (msg.mentions.repliedUser.id === user) {
				return true;
			}
		} else if ('id' in user) {
			if (msg.mentions.repliedUser.id === user.id) {
				return true;
			}
		}
	}
	return msg.mentions.has(user);
}

///
/// RNG utility
///

export function rollWithAdvantage(
	min: number,
	max: number,
	numAdvantages: number = 2,
	lowerIsBetter: boolean = false,
): number {
	const rolls: number[] = [];
	while (numAdvantages > 0) {
		numAdvantages--;
		rolls.push(min + Math.random() * (max - min));
	}

	if (lowerIsBetter) {
		return Math.min(...rolls);
	} else {
		return Math.max(...rolls);
	}
}

export function rollWithDisadvantage(
	min: number,
	max: number,
	numDisadvantages: number = 2,
	lowerIsBetter: boolean = false,
): number {
	const rolls: number[] = [];
	while (numDisadvantages > 0) {
		numDisadvantages--;
		rolls.push(min + Math.random() * (max - min));
	}

	if (lowerIsBetter) {
		return Math.max(...rolls);
	} else {
		return Math.min(...rolls);
	}
}

// advantages/disadvantages: 1 = normal roll, 2 = normal advantage/disadvantage, 3 = double etc.
export function fullRoll(
	min: number,
	max: number,
	advantages: number,
	disadvantages: number,
	lowerIsBetter: boolean = false,
): number {
	if (advantages === disadvantages) {
		return min + Math.random() * (max - min);
	}
	while (advantages > 1 && disadvantages > 1) {
		advantages--;
		disadvantages--;
	}

	if (advantages > disadvantages) {
		return rollWithAdvantage(min, max, advantages, lowerIsBetter);
	} else {
		return rollWithDisadvantage(min, max, disadvantages, lowerIsBetter);
	}
}

///
/// Misc utility
///

// async delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// returns a time in the format hh:mm:ss from a number of seconds
export function getTimeFromSeconds(seconds: number): string {
	let hours = Math.floor(seconds / 3600);
	let minutes = Math.floor((seconds % 3600) / 60);
	let secs = Math.floor(seconds % 60);

	let timeString = '';
	if (hours > 0) {
		timeString += hours + ':';
	}

	if(hours > 0 && minutes < 10) {
		timeString += '0';
	}
	timeString += minutes + ':';

	if(secs < 10) {
		timeString += '0';
	}
	timeString += secs;

	return timeString;
}