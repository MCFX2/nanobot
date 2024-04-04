import RssParser from "rss-parser";
import { Logger, WarningLevel } from "../logger";
import { serverLog, grocheCentral } from "../../groche-channels.json";
import { type Client, EmbedBuilder, type TextBasedChannel } from "discord.js";
import { getSingleElement, readCacheFileAsJson, writeCacheFile } from "../util";

const devMode: boolean = false;

const logger: Logger = new Logger(
	"feeds/smbc",
	devMode ? WarningLevel.Notice : WarningLevel.Warning,
);

let rssParser: RssParser;
let client: Client;

export function init_smbc(clientInstance: Client) {
	client = clientInstance;

	rssParser = new RssParser();
}

export async function check_smbc() {
	if (!rssParser) {
		logger.log(
			"Tried to check for daily update when we were not initialized!",
			WarningLevel.Error,
		);
		return;
	}

	const feed = await rssParser.parseURL(
		"https://www.smbc-comics.com/comic/rss",
	);

	const todaysComic = feed.items[0];

	const imgData = getSingleElement(todaysComic.content, "img", logger);

	if (!imgData) return;

	const imgUrl = imgData.getAttribute("src");

	const textData = getSingleElement(todaysComic.content, "p", logger);

	if (!textData) return;

	let pubDate = todaysComic.pubDate ? new Date(todaysComic.pubDate) : undefined;

	let comicTitle = todaysComic.title?.replace(
		"Saturday Morning Breakfast Cereal - ",
		"",
	);

	let altText = textData.text.replace("Hovertext:", "");

	logger.log(comicTitle);
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

	if (!devMode) {
		let lastComic = "";

		const cache = readCacheFileAsJson("smbc.json");

		if (!cache) {
			logger.log(
				"Failed to load cache data for some reason! New cache will be created",
				WarningLevel.Notice,
			);
		} else {
			lastComic = cache.lastComic;
			if (lastComic === todaysComic.guid) return;
		}

		lastComic = todaysComic.guid;

		// write back to file

		writeCacheFile(
			"smbc.json",
			Buffer.from(JSON.stringify({ lastComic: lastComic })),
		);
	}

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

	if (!comicTitle) {
		logger.log("No title for today's comic! ", WarningLevel.Warning);

		comicTitle = "Untitled";
	}

	// send comic

	const channel = (await client.channels.fetch(
		devMode ? serverLog : grocheCentral,
	)) as TextBasedChannel;

	const smbcEmbed = new EmbedBuilder()
		.setAuthor({
			name: "Saturday Morning Breakfast Cereal",
			url: "https://www.smbc-comics.com/",
			iconURL: "https://www.smbc-comics.com/images/moblogo.png",
		})
		.setTitle(comicTitle)
		.setImage(imgUrl)
		.setTimestamp(pubDate)
		.setFooter({ text: altText });

	channel.send({ embeds: [smbcEmbed] });
}
