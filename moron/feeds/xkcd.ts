import RssParser from 'rss-parser';
import { Logger, WarningLevel } from '../logger';
import { serverLog, grocheCentral } from '../../groche-channels.json';
import HtmlParser from 'node-html-parser';
import { Client, EmbedBuilder, TextBasedChannel } from 'discord.js';
import {
	Error,
	readCacheFile,
	writeCacheFile,
	getSingleElement,
} from '../util';

let rssParser: RssParser;
let logger: Logger = new Logger('feeds/xkcd', WarningLevel.Warning);

let client: Client;

export function init_xkcd(clientInstance: Client) {
	client = clientInstance;

	rssParser = new RssParser();
}

export async function check_xkcd() {
	if (!rssParser) {
		logger.log(
			'Tried to check for daily update when we were not initialized!',
			WarningLevel.Error,
		);
		return;
	}

	let feed = await rssParser.parseURL('https://xkcd.com/rss.xml');

	const todaysComic = feed.items[0];

	const imgData = getSingleElement(todaysComic.content, 'img', logger);

	if (!imgData) {
		return;
	}

	let imgUrl = imgData.getAttribute('src');
	let altText = imgData.getAttribute('alt');

	let pubDate = todaysComic.pubDate ? new Date(todaysComic.pubDate) : undefined;

	logger.log(todaysComic.title);
	logger.log(imgUrl);
	logger.log(altText);
	logger.log(todaysComic.guid);
	logger.log(pubDate ? pubDate.toString() : pubDate);

	// verify there's a comic to send
	if (!todaysComic.guid || !imgUrl) {
		logger.log(
			"No GUID and/or image URL for today's comic! It will be skipped!",
			WarningLevel.Error,
		);

		return;
	}

	// determine whether this comic was already sent

	let lastComic: string = '';

	let cache = readCacheFile('xkcd.json');
	if (!cache) {
		logger.log(
			'Failed to load cache data for some reason!',
			WarningLevel.Error,
		);
		return;
	}

	lastComic = JSON.parse(cache.toString()).lastComic;

	if (todaysComic.guid == lastComic) {
		return;
	}

	lastComic = todaysComic.guid;

	// write back to file

	writeCacheFile(
		'xkcd.json',
		Buffer.from(JSON.stringify({ lastComic: lastComic })),
	);

	// fix up any missing fields

	if (!altText) {
		logger.log("No alt text for today's comic!", WarningLevel.Warning);
		altText = '';
	}

	if (!pubDate) {
		logger.log(
			"No publish date for today's comic! Using today's date instead.",
			WarningLevel.Warning,
		);
		pubDate = new Date();
	}

	if (!todaysComic.title) {
		logger.log("No title for today's comic! ", WarningLevel.Warning);

		todaysComic.title = 'Untitled';
	}

	// send comic

	const channel = (await client.channels.fetch(
		grocheCentral,
	)) as TextBasedChannel;

	let explainUrl = todaysComic.guid.replace('xkcd', 'explainxkcd');

	let xkcdEmbed = new EmbedBuilder()
		.setAuthor({
			name: 'xkcd',
			url: 'https://xkcd.com',
			iconURL: 'https://xkcd.com/s/0b7742.png',
		})
		.setFields([
			{
				name: todaysComic.title,
				value: '[Explain the joke](' + explainUrl + ')',
				inline: false,
			},
		])
		.setImage(imgUrl)
		.setTimestamp(pubDate)
		.setFooter({ text: altText });

	channel.send({ embeds: [xkcdEmbed] });
}
