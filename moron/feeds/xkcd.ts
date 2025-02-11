import { type Client, EmbedBuilder, type TextBasedChannel } from "discord.js";
import RssParser from "rss-parser";
import { lounge } from "../../clockwork-channels.json";
import { Logger, WarningLevel } from "../logger";
import { getSingleElement, readCacheFile, writeCacheFile } from "../util";

let rssParser: RssParser;
const logger: Logger = new Logger("feeds/xkcd", WarningLevel.Warning);

let client: Client;

export function init_xkcd(clientInstance: Client) {
	client = clientInstance;

	rssParser = new RssParser();
}

export async function check_xkcd() {
	if (!rssParser) {
		logger.log(
			"Tried to check for daily update when we were not initialized!",
			WarningLevel.Error,
		);
		return;
	}

	const feed = await rssParser.parseURL("https://xkcd.com/rss.xml");

	const todaysComic = feed.items[0];

	const imgData = getSingleElement(todaysComic.content, "img", logger);

	if (!imgData) {
		return;
	}

	const imgUrl = imgData.getAttribute("src");
	let altText = imgData.getAttribute("alt");

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

	let lastComic = "";

	const cache = readCacheFile("xkcd.json");
	if (!cache) {
		logger.log(
			"Failed to load cache data for some reason!",
			WarningLevel.Error,
		);
		return;
	}

	lastComic = JSON.parse(cache.toString()).lastComic;

	if (todaysComic.guid === lastComic) {
		return;
	}

	lastComic = todaysComic.guid;

	// write back to file

	writeCacheFile(
		"xkcd.json",
		Buffer.from(JSON.stringify({ lastComic: lastComic })),
	);

	// fix up any missing fields

	if (!altText) {
		logger.log("No alt text for today's comic!", WarningLevel.Warning);
		altText = "";
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

		todaysComic.title = "Untitled";
	}

	// send comic

	const channel = (await client.channels.fetch(lounge)) as TextBasedChannel;

	const explainUrl = todaysComic.guid.replace("xkcd", "explainxkcd");

	const xkcdEmbed = new EmbedBuilder()
		.setAuthor({
			name: "xkcd",
			url: "https://xkcd.com",
			iconURL: "https://xkcd.com/s/0b7742.png",
		})
		.setFields([
			{
				name: todaysComic.title,
				value: `[Explain the joke](${explainUrl})`,
				inline: false,
			},
		])
		.setImage(imgUrl)
		.setTimestamp(pubDate)
		.setFooter({ text: altText });

	if (!channel.isDMBased()) {
		channel.send({ embeds: [xkcdEmbed] });
	} else {
		logger.log("DM channels are not supported!", WarningLevel.Error);
	}
}
