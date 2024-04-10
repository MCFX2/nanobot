import {
	type AudioPlayer,
	type AudioPlayerState,
	NoSubscriberBehavior,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	createAudioPlayer,
	createAudioResource,
	demuxProbe,
	entersState,
	getVoiceConnection,
	joinVoiceChannel,
} from "@discordjs/voice";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CacheType,
	type ChatInputCommandInteraction,
	Colors,
	EmbedBuilder,
	type Guild,
	GuildMember,
	Interaction,
	type TextChannel,
	type VoiceBasedChannel,
} from "discord.js";
import isUrl from "is-url";
import ytdl from "ytdl-core";
import ytpl from "ytpl";
import ytsr from "ytsr";
import { Logger, WarningLevel } from "./logger";
import type { MoronModule } from "./moronmodule";
import {
	delay,
	getTimeFromSeconds,
	isUrlDomain,
	readCacheFileAsJson,
	respond,
} from "./util";

const devMode: boolean = true;

const logger: Logger = new Logger(
	"bard",
	devMode ? WarningLevel.Info : WarningLevel.Warning,
);

export const Bard: MoronModule = {
	name: "bard",
	onInit: onInit,
};

interface SongQueueEntry {
	url: string;
	title: string;
	thumbnailUrl: string;
	authorUrl: string;
	authorAvatarUrl?: string;
	authorName: string;
	requestedBy: GuildMember;
	interactionChannel: TextChannel;
	lengthMs: number;
	currentProgressMs?: number;
	timeStartedMs?: number;
	playlist?: string;
}

// map of tags to song urls
const savedTags = new Map<string, string[]>();

async function onInit() {
	logger.log("bard module initialized", WarningLevel.Info);

	// load tags from database
	const tagCache = readCacheFileAsJson("bard-tags.json") ?? {};

	for (const tag in tagCache) {
		savedTags.set(tag, tagCache[tag]);
	}
}

async function SongEntryFromUrl(
	url: string,
	requestedBy: GuildMember,
	interactionChannel: TextChannel,
): Promise<SongQueueEntry | undefined> {
	try {
		const info = (await ytdl.getBasicInfo(url)).videoDetails;

		return {
			url: url,
			title: info.title,
			thumbnailUrl: info.thumbnails[0].url,
			authorUrl: info.author.channel_url,
			authorAvatarUrl: info.author.thumbnails?.at(0)?.url,
			authorName: info.author.name,
			requestedBy: requestedBy,
			interactionChannel: interactionChannel,
			lengthMs: Number.parseInt(info.lengthSeconds) * 1000,
		};
	} catch (e: unknown) {
		const err = e as Error;
		logger.log(err.message, WarningLevel.Error);
		logger.log(err.stack, WarningLevel.Error);
		logger.log(
			"Could not get info from url - something is wrong with the url checks up to this point",
			WarningLevel.Error,
		);
		return undefined;
	}
}

let isReconnecting = false;

const songQueue: SongQueueEntry[] = [];

let nowPlaying: SongQueueEntry | undefined = undefined;

const player: AudioPlayer = createAudioPlayer({
	behaviors: {
		maxMissedFrames: 1,
		noSubscriber: NoSubscriberBehavior.Stop,
	},
}).on("error", async (error) => {
	// if the user manually disconnects us from the voice channel,
	// we can hit this path
	// i think it's very silly though
	logger.log(error.message);
	isReconnecting = true;
	if (nowPlaying) {
		if (!nowPlaying.timeStartedMs) {
			logger.log(
				"Song started playing but timeStarted was undefined",
				WarningLevel.Error,
			);
			nowPlaying = songQueue.shift();
		} else {
			nowPlaying.currentProgressMs = +Date.now() - nowPlaying.timeStartedMs;
		}

		if (!nowPlaying) {
			return;
		}

		logger.log(
			`Error occurred while playing ${nowPlaying.title}, reconnecting...`,
			WarningLevel.Error,
		);
		await delay(2000);
		playStream();
	}
	logger.log(error.message, WarningLevel.Error);
	isReconnecting = false;
});

function getCurrentStream(guild: Guild, channelId: string, create: boolean) {
	const connection = getVoiceConnection(guild.id);
	if (!connection && create) {
		const newConnection = joinVoiceChannel({
			channelId: channelId,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
			selfDeaf: true,
		})
			.on(
				VoiceConnectionStatus.Disconnected,
				async (_, newState: { reason: VoiceConnectionDisconnectReason }) => {
					if (
						newState.reason === VoiceConnectionDisconnectReason.WebSocketClose
					) {
						try {
							await entersState(
								newConnection,
								VoiceConnectionStatus.Connecting,
								5000,
							);
							// probably moved voice channel
						} catch {
							// probably removed from voice channel
							songQueue.length = 0;
							nowPlaying = undefined;
							logger.log("Moron was manually disconnected from voice channel");
							if (
								newConnection.state.status !== VoiceConnectionStatus.Destroyed
							) {
								newConnection.destroy();
							}
						}
					} else if (newConnection.rejoinAttempts < 5) {
						await delay((newConnection.rejoinAttempts + 1) * 5000);
						newConnection.rejoin();
					} else {
						songQueue.length = 0;
						nowPlaying = undefined;
						// the player probably was destroyed already
						logger.log(
							"Connection was disconnected for some reason, clearing queue",
							WarningLevel.Error,
						);
						newConnection.destroy();
					}
				},
			)
			.on(VoiceConnectionStatus.Destroyed, () => {
				player.stop();
				player.off("stateChange", streamCallback);
			});

		newConnection.subscribe(player);
		player.on("stateChange", streamCallback);
		return newConnection;
	}
	return connection;
}

async function playStream() {
	if (!nowPlaying) {
		logger.log(
			"nowPlaying was undefined when trying to play stream",
			WarningLevel.Error,
		);
		return;
	}

	try {
		const { stream, type } = await demuxProbe(
			ytdl(nowPlaying.url, {
				filter: "audioonly",
				quality: "highestaudio",
				highWaterMark: 1024 * 1024 * 32, // 32MB
				begin: nowPlaying.currentProgressMs ? nowPlaying.currentProgressMs : 0,
			}),
		);

		if (!nowPlaying) {
			logger.log(new Error().stack, WarningLevel.Error);
			logger.log(
				"nowPlaying became undefined while trying to play stream",
				WarningLevel.Error,
			);
			return;
		}

		const resource = createAudioResource(stream, {
			inlineVolume: true,
			inputType: type,
			silencePaddingFrames: 1,
		});

		player.play(resource);

		nowPlaying.timeStartedMs = +Date.now();
	} catch (e: unknown) {
		const err = e as Error;
		logger.log(err.message, WarningLevel.Error);
		logger.log(err.stack, WarningLevel.Error);
		logger.log(
			"Could not start stream - something is wrong with the url checks up to this point",
			WarningLevel.Error,
		);
		return;
	}
}

function streamCallback(_: AudioPlayerState, newStatus: AudioPlayerState) {
	if (newStatus.status === "idle") {
		if (isReconnecting) {
			return;
		}

		if (!nowPlaying) {
			return;
		}

		logger.log(`Finished playing ${nowPlaying.title}`);
		const channel = nowPlaying.interactionChannel;
		const stream = getCurrentStream(channel.guild, channel.id, false);
		if (!stream) {
			logger.log(
				"stream was undefined when audio player finished, this should never happen",
				WarningLevel.Error,
			);
			return;
		}

		if (stream.state.status === VoiceConnectionStatus.Destroyed) {
			logger.log("not advancing queue because connection was destroyed");
			// clear the queue instead
			songQueue.length = 0;
			nowPlaying = undefined;
		} else {
			advanceQueue();
		}
	}
}

// returns true if there was already a song playing (i.e. we've only added to the queue)
// returns false if we had to start a stream (i.e. we were idle)
function playSong(song: SongQueueEntry, voiceChannel: VoiceBasedChannel) {
	if (nowPlaying) {
		// queue up a song
		songQueue.push(song);
		return true;
	}
	const connection = getCurrentStream(
		voiceChannel.guild,
		voiceChannel.id,
		true,
	);

	// should never happen
	if (!connection) return;

	connection.once(VoiceConnectionStatus.Ready, async () => {
		// await delay(500);
		nowPlaying = song;
		playStream();
	});
	return false;
}

async function tryPlaySong(
	interaction: ChatInputCommandInteraction | ButtonInteraction<CacheType>,
	songId: string,
	voiceChannel: VoiceBasedChannel,
) {
	const songEntry = await SongEntryFromUrl(
		songId,
		interaction.member as GuildMember,
		interaction.channel as TextChannel,
	);
	if (!songEntry) {
		return respond(
			interaction,
			"(internal error)\nhttps://tenor.com/view/rip-bozo-gif-22294771",
		);
	}
	if (playSong(songEntry, voiceChannel)) {
		return respond(
			interaction,
			`${songEntry.title} has been added to the queue. please take a number (#${songQueue.length})`,
		);
	}
	return respond(
		interaction,
		`okay, fine. i will wake up JUST so i can play ${songEntry.title} for you.`,
	);
}

async function tryQueuePlaylist(
	playlistId: string,
	interaction: ChatInputCommandInteraction | ButtonInteraction<CacheType>,
	voiceChannel: VoiceBasedChannel,
	playlistItems: ytpl.Result | undefined = undefined,
) {
	// Queuing a playlist could take a while, so we should defer the reply
	interaction.deferReply();

	let cleanPlaylist = playlistItems;
	if (!playlistItems) {
		cleanPlaylist = await ytpl(playlistId, {
			limit: Number.POSITIVE_INFINITY,
			pages: Number.POSITIVE_INFINITY,
		}).catch((_e: unknown) => {
			respond(
				interaction,
				"i couldn't get the playlist. it's probably private or something. i don't know. i'm just a bot. i don't know anything.",
				true,
			);
			return undefined;
		});
	}

	if (!cleanPlaylist) {
		return;
	}

	const oldQueueLength = songQueue.length;
	const startedEmpty = !nowPlaying;
	const member = interaction.member as GuildMember;

	let failedItems = 0;
	let actualItems = 0;
	for (const entry of cleanPlaylist.items) {
		const songEntry = await SongEntryFromUrl(
			entry.url,
			member,
			interaction.channel as TextChannel,
		);
		if (!songEntry) {
			failedItems++;
			continue;
		}
		songEntry.playlist = playlistId;
		playSong(songEntry, voiceChannel);
		actualItems++;
	}

	await respond(
		interaction,
		`okay, i've added ${actualItems} songs to the queue. please take a number (#${
			startedEmpty ? 0 : oldQueueLength + 1
		}-${songQueue.length})`,
	);
	interaction.deleteReply();
}

async function optionalPlaylistPrompt(
	interaction: ChatInputCommandInteraction,
	playlistId: string,
	videoId: string,
	voiceChannel: VoiceBasedChannel,
) {
	const playlistItems = await ytpl(playlistId, {
		limit: Number.POSITIVE_INFINITY,
		pages: Number.POSITIVE_INFINITY,
	}).catch((_e: unknown) => {
		respond(
			interaction,
			"i couldn't get the playlist. it's probably private or something. i don't know. i'm just a bot. i don't know anything.",
			true,
		);
		return undefined;
	});

	if (!playlistItems) {
		// assume it's a private playlist and fall back to adding just the song
		return tryPlaySong(interaction, videoId, voiceChannel);
	}

	const numItems = playlistItems.estimatedItemCount;

	const addPlaylistButton = new ButtonBuilder()
		.setCustomId("addPlaylist")
		.setLabel(`Add Playlist (${numItems} items)`)
		.setStyle(ButtonStyle.Primary);

	const addSongButton = new ButtonBuilder()
		.setCustomId("addSong")
		.setLabel("Just this")
		.setStyle(ButtonStyle.Primary);

	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel("Cancel")
		.setStyle(ButtonStyle.Secondary);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		addSongButton,
		addPlaylistButton,
		cancelButton,
	);

	interaction.reply({
		content:
			"this appears to be a playlist. do you want to add the whole playlist or just this song?",
		ephemeral: true,
		components: [row],
	});

	// wait for a response
	const response = await interaction.channel
		?.awaitMessageComponent({
			time: 30000,
		})
		.catch((e) => {
			interaction.reply({
				content: "you took too long, i'm not waiting for you anymore",
				ephemeral: true,
			});
			return undefined;
		});

	if (!response) {
		interaction.followUp("okay.. i've cancelled that");
		return;
	}

	if (response.customId === "addPlaylist") {
		tryQueuePlaylist(
			playlistId,
			response as ChatInputCommandInteraction | ButtonInteraction,
			voiceChannel,
		);
		return;
	}
	if (response.customId === "addSong") {
		response.deferReply();
		await tryPlaySong(
			response as ChatInputCommandInteraction | ButtonInteraction,
			videoId,
			voiceChannel,
		);
		interaction.deleteReply();
		return;
	}
	if (response.customId === "cancel") {
		interaction.editReply({
			content: "okay, i'm not adding anything",
			components: [],
		});
		return;
	}
}

function getPlaylistIdFromUrl(url: string): string | undefined {
	const playlistString = "&list=";
	const altPlaylistString = "/playlist?list=";
	const listIdx = url.indexOf(playlistString);
	const altListIdx = url.indexOf(altPlaylistString);
	const listEndIdx = url.indexOf("&", listIdx + playlistString.length);
	const altListEndIdx = url.indexOf("&", altListIdx + altPlaylistString.length);
	if (listIdx !== -1 || altListIdx !== -1) {
		let playlist = "";
		const isAltPlaylist = altListIdx !== -1;
		if (!isAltPlaylist) {
			playlist = url.substring(
				listIdx + playlistString.length,
				listEndIdx !== -1 ? listEndIdx : undefined,
			);
		} else if (isAltPlaylist) {
			playlist = url.substring(
				altListIdx + altPlaylistString.length,
				altListEndIdx !== -1 ? altListEndIdx : undefined,
			);
		}
		return playlist;
	}
	return undefined;
}

function getLinkType(url: string): "youtube" | "unsupported" | "searchTerm" {
	if (
		isUrlDomain(url, "youtube.com") ||
		isUrlDomain(url, "music.youtube.com")
	) {
		return "youtube";
	}
	if (isUrl(url)) {
		return "unsupported";
	}
	return "searchTerm";
}

export async function playAudioCommand(
	interaction: ChatInputCommandInteraction,
) {
	const item = interaction.options.getString("item");
	if (!item) {
		interaction.reply({ content: "wtf (no argument)", ephemeral: true });
		return;
	}

	const member = interaction.member;

	if (!member || !(member instanceof GuildMember)) {
		interaction.reply({ content: "wtf (invalid user)", ephemeral: true });
		return;
	}

	const voiceChannel = member.voice.channel;

	if (!voiceChannel) {
		interaction.reply({
			content:
				"okay you clever chucklefuck, how the fuck am i supposed to know which channel to join\n\n(user must be in voice channel for this command)",
			ephemeral: true,
		});
		return;
	}

	if (voiceChannel.full) {
		interaction.reply({
			content:
				"that channel is full, buddy. what can i say i'm large and in charge",
			ephemeral: true,
		});
		return;
	}

	let url: string = item;

	const queryType = getLinkType(url);
	if (queryType === "unsupported") {
		interaction.reply({
			content: "buddy. i do NOT know wtf kind of link that is.",
			ephemeral: true,
		});
		return;
	}

	if (queryType === "searchTerm") {
		const searchResults = ytsr(item, {
			limit: 20,
			pages: 1,
			safeSearch: false,
		});

		// for now, assume that they want the first (video) result
		const firstVideo = (await searchResults).items.find(
			(i) => i.type === "video",
		) as ytsr.Video | undefined;
		if (!firstVideo) {
			// todo: figure out why this happens
			interaction.reply({
				content:
					":/ that search term reminded me of something bad. sorry. im not queueing it.",
				ephemeral: true,
			});
			return;
		}

		url = firstVideo.url;
	}

	// check if it's part of a playlist
	const playlistId = getPlaylistIdFromUrl(url);
	const videoId = ytdl.getVideoID(url);
	if (playlistId) {
		if (videoId) {
			optionalPlaylistPrompt(interaction, playlistId, videoId, voiceChannel);
			return;
		}
		tryQueuePlaylist(playlistId, interaction, voiceChannel);
		return;
	}

	if (!videoId) {
		// should never happen
		respond(interaction, "idk", true);
		return;
	}

	const songEntry = await SongEntryFromUrl(
		url,
		member,
		interaction.channel as TextChannel,
	);

	if (!songEntry) {
		respond(
			interaction,
			"(internal error)\nhttps://tenor.com/view/rip-bozo-gif-22294771",
		);
		return;
	}

	if (playSong(songEntry, voiceChannel)) {
		respond(
			interaction,
			`${songEntry.title} has been added to the queue. please take a number (#${songQueue.length})`,
		);
		return;
	}
	respond(
		interaction,
		`okay, fine. i will wake up JUST so i can play ${songEntry.title} for you.`,
	);
	return;
}

// returns true when the queue was advanced, false when the queue was empty
function advanceQueue(): boolean {
	if (songQueue.length > 0) {
		nowPlaying = songQueue.shift();
		playStream();
		return true;
	}
	const channel = nowPlaying?.interactionChannel;
	if (!channel) {
		logger.log(
			"interaction channel was undefined when trying to advance queue",
			WarningLevel.Error,
		);
		return false;
	}
	const stream = getCurrentStream(channel.guild, channel.id, false);
	nowPlaying = undefined;
	stream?.destroy();
	return false;
}

export function skipCommand(interaction: ChatInputCommandInteraction) {
	if (!nowPlaying) {
		interaction.reply({
			content: "nothing is playing right now, so there's nothing to skip",
			ephemeral: true,
		});
		return;
	}

	if (advanceQueue()) {
		interaction.reply("okay, i'm skipping that song");
	} else {
		interaction.reply({ content: "i am slain (queue is empty)" });
	}
}

export function queueCommand(interaction: ChatInputCommandInteraction) {
	const pageSize = 10;
	if (songQueue.length === 0 || !nowPlaying) {
		interaction.reply({
			content: "queue machine broke (empty queue)",
			ephemeral: true,
		});
		return;
	}

	const page = interaction.options.getInteger("page") ?? 1;

	const curSongProgressSeconds =
		(+Date.now() - (nowPlaying.timeStartedMs ?? 0)) / 1000;
	let runtimeSeconds = nowPlaying.lengthMs / 1000 - curSongProgressSeconds;
	const queue = songQueue
		.map((song, index) => {
			const timeToHere = runtimeSeconds;
			runtimeSeconds += song.lengthMs / 1000;
			if (index === 0) {
				return "";
			}

			if (index < (page - 1) * pageSize || index >= page * pageSize) {
				return "";
			}

			// display songs in format [-hh:mm:ss] #. title (hh:mm:ss)
			return `[-${getTimeFromSeconds(timeToHere)}] ${index + 1}. ${
				song.title
			} (${getTimeFromSeconds(song.lengthMs / 1000)})`;
		})
		.filter((item) => item.length > 0)
		.join("\n");

	// build embed for "on-deck" song and queue
	const embed = new EmbedBuilder().setFooter({
		text: `Page ${page} of ${Math.ceil(songQueue.length / 10)}`,
	});

	if (page === 1) {
		embed
			.setTitle(
				`On Deck (in ${getTimeFromSeconds(
					nowPlaying.lengthMs / 1000 - curSongProgressSeconds,
				)})`,
			)
			.setDescription(
				`1. ${songQueue[0].title} (${getTimeFromSeconds(
					songQueue[0].lengthMs / 1000,
				)})`,
			)
			.setURL(songQueue[0].url)
			.setThumbnail(songQueue[0].thumbnailUrl)
			.setAuthor({
				name: songQueue[0].authorName,
				iconURL: songQueue[0].authorAvatarUrl,
				url: songQueue[0].authorUrl,
			});

		if (queue.length > 0) {
			embed.addFields([
				{
					name: "Queue",
					value: queue,
					inline: false,
				},
			]);
		}
	} else {
		embed
			.setTitle(
				`Queue (${Math.min(page * pageSize, songQueue.length)} / ${
					songQueue.length
				})`,
			)
			.setDescription(queue);
	}

	interaction.reply({ embeds: [embed] });
}

function removePlaylistSongsFromQueue(playlist: string) {
	let i = 0;
	let j = 0;
	while (i < songQueue.length) {
		if (songQueue[i].playlist !== playlist) {
			songQueue[j++] = songQueue[i];
		}
		i++;
	}

	songQueue.length = j;
}

export function nowPlayingCommand(interaction: ChatInputCommandInteraction) {
	if (!nowPlaying) {
		interaction.reply({ content: "nothing" });
		return;
	}

	const songLengthSeconds = nowPlaying.lengthMs / 1000;
	const songProgressSeconds =
		(+Date.now() - (nowPlaying.timeStartedMs ?? 0)) / 1000;

	const progressBarSize = 25;
	const progressBar = [..."-".repeat(progressBarSize)];
	progressBar[
		Math.floor((songProgressSeconds / songLengthSeconds) * progressBarSize)
	] = "O";

	const embed = new EmbedBuilder()
		.setTitle(nowPlaying.title)
		.setURL(nowPlaying.url)
		.setImage(nowPlaying.thumbnailUrl)
		.setAuthor({
			name: nowPlaying.authorName,
			iconURL: nowPlaying.authorAvatarUrl,
			url: nowPlaying.authorUrl,
		})
		.setFooter({
			text: `Requested by ${nowPlaying.requestedBy.displayName}`,
		})
		.setDescription(
			`Length: ${getTimeFromSeconds(
				nowPlaying.lengthMs / 1000,
			)} | Time left: ${getTimeFromSeconds(
				songLengthSeconds - songProgressSeconds,
			)}\n[${progressBar.join("")}]`,
		)
		.setTimestamp(nowPlaying.timeStartedMs)
		.setColor(Colors.Red);

	interaction.reply({ embeds: [embed] });
}

export async function removeCommand(interaction: ChatInputCommandInteraction) {
	const item = interaction.options.getString("item") ?? "";
	const index = Number.parseInt(item);

	if (Number.isNaN(index)) {
		interaction.reply({
			content:
				"that is not a valid number (support for this coming eventually)",
			ephemeral: true,
		});
		return;
	}

	if (index < 0 || index > songQueue.length) {
		interaction.reply({
			content: "gross. bad number. go to jail",
			ephemeral: true,
		});
		return;
	}

	if (index === 0) {
		if (nowPlaying?.playlist) {
			const yesButton = new ButtonBuilder()
				.setCustomId("removePlaylist")
				.setLabel("Yes")
				.setStyle(ButtonStyle.Danger);
			const noButton = new ButtonBuilder()
				.setCustomId("removeSingle")
				.setLabel("No")
				.setStyle(ButtonStyle.Success);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				yesButton,
				noButton,
			);

			const response = await interaction.reply({
				content:
					"That song appears to be part of a playlist. Do you want to remove the entire playlist?",
				components: [row],
				ephemeral: true,
			});

			try {
				const confirmation = await response.awaitMessageComponent({
					time: 30000,
				});
				if (confirmation.customId === "removePlaylist") {
					// remove all songs from queue that are part of the playlist
					const oldSize = songQueue.length;
					removePlaylistSongsFromQueue(nowPlaying.playlist);
					interaction.followUp({
						content: `I removed ${
							oldSize - songQueue.length
						} songs from the queue.`,
					});
					//skipCommand(interaction);
				} else {
					// assume they meant to not do that
					advanceQueue();
				}
			} catch (e) {
				interaction.editReply({
					content:
						"You took too long to respond. I'm not removing the playlist OR the song. fucko.",
					components: [],
				});
				return;
			}
			return;
		}
		skipCommand(interaction);
		return;
	}

	const removed = songQueue.splice(index - 1, 1);

	if (removed[0].playlist) {
		const yesButton = new ButtonBuilder()
			.setCustomId("removePlaylist")
			.setLabel("Yes")
			.setStyle(ButtonStyle.Danger);
		const noButton = new ButtonBuilder()
			.setCustomId("removeSingle")
			.setLabel("No")
			.setStyle(ButtonStyle.Secondary);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			yesButton,
			noButton,
		);

		const response = await interaction.reply({
			content:
				"That song appears to be part of a playlist. Do you want to remove the entire playlist?",
			components: [row],
			ephemeral: true,
		});

		try {
			const confirmation = await response.awaitMessageComponent({
				time: 30000,
			});
			if (confirmation.customId === "removePlaylist") {
				// remove all songs from queue that are part of the playlist
				const skipCurrent = nowPlaying?.playlist === removed[0].playlist;
				const oldSize = songQueue.length + 1 + (skipCurrent ? 1 : 0);
				removePlaylistSongsFromQueue(removed[0].playlist);
				confirmation.reply({
					content: `I removed ${
						oldSize - songQueue.length
					} songs from the queue. bitch`,
				});
				interaction.deleteReply();
				// also check if the current song is part of that playlist
				if (skipCurrent) {
					advanceQueue();
				}
				return;
			}
			// nothing more needs to be done here
			confirmation.reply({
				content:
					"ok. i'm not removing the playlist. i'm just removing the song. i promise",
				ephemeral: true,
			});
		} catch (e) {
			interaction.editReply({
				content:
					"You took too long to respond. I'm not removing the playlist OR the song. fucko",
				components: [],
			});
			return;
		}
		return;
	}
	interaction.reply(
		`i took ${removed[0].title} outta the lineup boss. hope you like that.`,
	);
}

export function shuffleCommand(interaction: ChatInputCommandInteraction) {
	interaction.reply({
		content: "this command is not yet implemented",
		ephemeral: true,
	});
}

export function randomizeCommand(interaction: ChatInputCommandInteraction) {
	// shuffle song queue
	for (let i = songQueue.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[songQueue[i], songQueue[j]] = [songQueue[j], songQueue[i]];
	}
	interaction.reply({
		content: "song queue got shuffled already bud, go check :)",
		ephemeral: true,
	});
}

export function tagCommand(interaction: ChatInputCommandInteraction) {
	const tag = interaction.options.getString("tag");

	if (!tag) {
		interaction.reply({ content: "this should never happen. :|" });
		return;
	}

	if (!nowPlaying) {
		interaction.reply({
			content: "sorry, you can only tag the current playing song for now",
			ephemeral: true,
		});
		return;
	}

	const curTag = savedTags.get(tag);
	if (curTag) {
		if (curTag.includes(nowPlaying.url)) {
			interaction.reply({
				content: `that song is already tagged with ${tag}`,
				ephemeral: true,
			});
			return;
		}
		curTag.push(nowPlaying.url);
		interaction.reply({ content: "✅ tagged", ephemeral: true });
		return;
	}
	savedTags.set(tag, [nowPlaying.url]);
	interaction.reply({ content: "✅ tagged", ephemeral: true });
}
