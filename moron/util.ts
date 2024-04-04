import * as fs from "node:fs";
import * as settings from "../config/general.json";
import { Logger, WarningLevel } from "./logger";
import HtmlParser, { type HTMLElement } from "node-html-parser";
import {
	type CategoryChannel,
	type DMChannel,
	EmbedBuilder,
	type ForumChannel,
	type Guild,
	type GuildEmoji,
	type GuildMember,
	type Message,
	type NewsChannel,
	type PartialDMChannel,
	type PartialGroupDMChannel,
	type PrivateThreadChannel,
	type PublicThreadChannel,
	type Role,
	type StageChannel,
	type TextChannel,
	type ThreadMember,
	type User as DiscordUser,
	type VoiceChannel,
	type ChatInputCommandInteraction,
	type ButtonInteraction,
	type CacheType,
} from "discord.js";
import isUrl from "is-url";
///
/// set up logger for util functions
///

const logger: Logger = new Logger("utils", WarningLevel.Warning);

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
	match = "";
	// ignores any character found in punctuationChars[] for comparison purposes
	ignorePunctuation = true;
	// converts both this string and whatever it's being compared to lower-case before comparison
	ignoreCapitalization = true;
}

// creates an array of stringmatches with the corresponding strings, all with the same stringmatch options
export function stringSet(
	matches: string[],
	ignorePunctuation: boolean,
	ignoreCapitalization: boolean,
): StringMatch[] {
	const results: StringMatch[] = [];
	for (const match of matches) {
		results.push({
			match: match,
			ignorePunctuation: ignorePunctuation,
			ignoreCapitalization: ignoreCapitalization,
		});
	}

	return results;
}

const punctuationChars: string[] = [
	"'",
	'"',
	".",
	",",
	"_",
	"-",
	"*",
	"&",
	"%",
	"$",
	"#",
	"@",
	"!",
	"`",
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
		for (const char of punctuationChars) {
			cmpString1.replace(char, "");
			cmpString2.replace(char, "");
		}
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
		for (const char of punctuationChars) {
			cmpString1.replace(char, "");
			cmpString2.replace(char, "");
		}
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
	let beforeMatchPos = -1;
	if (matchCandidates.length > 0) {
		for (const match of matchCandidates) {
			const matchPos = whereMatch(inputString, match);
			if (matchPos !== -1) {
				if (beforeMatchPos === -1) {
					beforeMatchPos = matchPos;
					beforeMatch = match;
				} else if (beforeMatchPos > matchPos) {
					beforeMatchPos = matchPos;
					beforeMatch = match;
				}
			}
		}
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
	let lastMatchPos = -1;
	if (matchCandidates.length > 0) {
		for (const match of matchCandidates) {
			const matchPos = whereMatch(inputString, match);
			if (matchPos !== -1) {
				if (lastMatchPos === -1) {
					lastMatchPos = matchPos;
					lastMatch = match;
				} else if (lastMatchPos < matchPos) {
					lastMatchPos = matchPos;
					lastMatch = match;
				}
			}
		}
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
	} catch (err: unknown) {
		return undefined;
	}
}

// converts <:emote:1234567890> to 1234567890
export function emoteNameToId(emoji: string) {
	return emoji.substring(emoji.lastIndexOf(":") + 1, emoji.length - 1);
}

///
/// cache management simplified
///

function createCacheFile(filename: string) {
	try {
		fs.writeFileSync(settings.cacheDir + filename, "");
	} catch (error: unknown) {
		if ((error as Error).code === "ENOENT") {
			fs.mkdirSync(settings.cacheDir);
			fs.writeFileSync(settings.cacheDir + filename, "");
		} else {
			logger.log(error, WarningLevel.Error);
		}
	}
}

export function writeCacheFile(filename: string, contents: Buffer) {
	try {
		fs.writeFileSync(settings.cacheDir + filename, contents);
	} catch (error: unknown) {
		if ((error as Error).code === "ENOENT") {
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
	} catch (error: unknown) {
		//create new db file if it does not already exist
		if ((error as Error).code === "ENOENT") {
			createCacheFile(filename);
		} else {
			logger.log(error, WarningLevel.Error);
		}
		return undefined;
	}
}

// same as readCacheFile but it also parses the result into a JSON object
// returns undefined if the file could not be created or was empty
export function readCacheFileAsJson(filename: string) {
	const buf = readCacheFile(filename);
	if (!buf) {
		return undefined;
	}
	if (buf.length === 0) {
		return undefined;
	}

	try {
		return JSON.parse(buf.toString());
	} catch (err: unknown) {
		// return invalid JSON as undefined
		logger.log(
			`Corrupt or invalid JSON loaded from ${filename}`,
			WarningLevel.Warning,
		);
		logger.log(err, WarningLevel.Error);
		return undefined;
	}
}

// same as writeCacheFile but covers the most common use case
// where we want to simply dump the object as-is as a formatted JSON
export function writeCacheFileAsJson(filename: string, contents: unknown) {
	writeCacheFile(filename, Buffer.from(JSON.stringify(contents, null, "\t")));
}

///
/// RSS parsing convenience
///

export function getSingleElement(
	htmlSource: string | undefined,
	tagName: string,
	errorLogger: Logger,
): HTMLElement | undefined {
	const elements = HtmlParser.parse(htmlSource ?? "< />").getElementsByTagName(
		tagName,
	);

	if (elements.length !== 1) {
		errorLogger.log(
			`Number of elements matching ${tagName} tag was ${elements.length} but we expected one! Did the RSS syntax change?`,
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
		if (url.hostname.startsWith("www.")) {
			url.hostname = url.hostname.substring(4);
		}
		if (url.hostname === domain) return true;
		return false;
	}
	return false;
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
		if (typeof user === "string") {
			if (msg.mentions.repliedUser.id === user) {
				return true;
			}
		} else if ("id" in user) {
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
	numAdvantages = 2,
	lowerIsBetter = false,
): number {
	const rolls: number[] = [];
	for (let i = 0; i < numAdvantages; i++) {
		rolls.push(min + Math.random() * (max - min));
	}

	if (lowerIsBetter) {
		return Math.min(...rolls);
	}
	return Math.max(...rolls);
}

export function rollWithDisadvantage(
	min: number,
	max: number,
	numDisadvantages = 2,
	lowerIsBetter = false,
): number {
	const rolls: number[] = [];
	for (let i = 0; i < numDisadvantages; i++) {
		rolls.push(min + Math.random() * (max - min));
	}

	if (lowerIsBetter) {
		return Math.max(...rolls);
	}
	return Math.min(...rolls);
}

// advantages/disadvantages: 1 = normal roll, 2 = normal advantage/disadvantage, 3 = double etc.
export function fullRoll(
	min: number,
	max: number,
	advantages: number,
	disadvantages: number,
	lowerIsBetter = false,
): number {
	if (advantages === disadvantages) {
		return min + Math.random() * (max - min);
	}

	if (advantages > disadvantages) {
		return rollWithAdvantage(
			min,
			max,
			advantages - disadvantages,
			lowerIsBetter,
		);
	}
	return rollWithDisadvantage(
		min,
		max,
		disadvantages - advantages,
		lowerIsBetter,
	);
}

///
/// Misc utility
///

// async delay
export const delay = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

// returns a time in the format hh:mm:ss from a number of seconds
export function getTimeFromSeconds(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	let timeString = "";
	if (hours > 0) {
		timeString += `${hours}:`;
	}

	if (hours > 0 && minutes < 10) {
		timeString += "0";
	}
	timeString += `${minutes}:`;

	if (secs < 10) {
		timeString += "0";
	}
	timeString += secs;

	return timeString;
}

export async function respond(
	interaction: ChatInputCommandInteraction | ButtonInteraction<CacheType>,
	response: string,
	ephemeral = false,
) {
	if (interaction.replied || interaction.deferred) {
		interaction.followUp({
			content: response,
			ephemeral: ephemeral,
		});
		return;
	}
	interaction.reply({
		content: response,
		ephemeral: ephemeral,
	});
}
