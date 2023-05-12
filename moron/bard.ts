import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, Colors, EmbedBuilder, Guild, GuildMember, TextChannel, VoiceBasedChannel } from "discord.js";
import { Logger, WarningLevel } from "./logger";
import { MoronModule } from "./moronmodule";
import { AudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, StreamType, VoiceConnectionDisconnectReason, VoiceConnectionStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import ytdl from "ytdl-core";
import { delay, getTimeFromSeconds, isUrlDomain } from "./util";
import isUrl from "is-url";
import ytsr from "ytsr";
import ytpl from "ytpl";

const devMode: boolean = true;

const logger: Logger = new Logger('bard', devMode ? WarningLevel.Info : WarningLevel.Warning);

export const Bard: MoronModule = {
	name: 'bard',
}

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

async function SongEntryFromUrl(url: string, requestedBy: GuildMember, interactionChannel: TextChannel): Promise<SongQueueEntry>
{
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
			lengthMs: parseInt(info.lengthSeconds) * 1000,
		}
	}
	catch (e: any) {
		const err = e as Error;
		logger.log(err.message, WarningLevel.Error);
		logger.log(err.stack, WarningLevel.Error);
		logger.log('Could not get info from url - something is wrong with the url checks up to this point', WarningLevel.Error);
		return {
			url: url,
			title: 'Unknown',
			thumbnailUrl: 'https://i.imgur.com/u6ROwvK.png',
			authorUrl: 'about:blank',
			authorName: 'Unknown',
			requestedBy: requestedBy,
			interactionChannel: interactionChannel,
			lengthMs: 1,
		};
	}
}

let isReconnecting: boolean = false;

const songQueue: SongQueueEntry[] = [];

let nowPlaying: SongQueueEntry | undefined = undefined;

let player: AudioPlayer = createAudioPlayer({
	behaviors: {
		maxMissedFrames: 1,
		noSubscriber: NoSubscriberBehavior.Pause,
	}
}).on('error', async (error) => {
	isReconnecting = true;
	logger.log('top');
	if (nowPlaying) {
		if (!nowPlaying.timeStartedMs)
		{
			logger.log('Song started playing but timeStarted was undefined', WarningLevel.Error);
			nowPlaying = songQueue.shift();
		}
		else {
			nowPlaying.currentProgressMs = (+Date.now()) - nowPlaying.timeStartedMs;
		}

		await delay(1000);
		startStream();
	}
	logger.log(error.message, WarningLevel.Error);
	isReconnecting = false;
});

function getCurrentStream(guild: Guild, channelId: string, create: boolean = true) {
	const connection = getVoiceConnection(channelId);
	if (!connection && create)
	{
		let newConnection = joinVoiceChannel({
			channelId: channelId,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
			selfDeaf: true,
		}).on(VoiceConnectionStatus.Disconnected, async (_, newState: {reason: VoiceConnectionDisconnectReason }) => {
			if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose) {
				try {
					await entersState(newConnection, VoiceConnectionStatus.Connecting, 5000);
					// probably moved voice channel
				}
				catch {
					// probably removed from voice channel
					songQueue.length = 0;
					nowPlaying = undefined;
					newConnection.destroy();
				}
			} else if (newConnection.rejoinAttempts < 5) {
				await delay((newConnection.rejoinAttempts + 1) * 5000);
				newConnection.rejoin();
			}
			else {
				songQueue.length = 0;
				nowPlaying = undefined;
				// the player probably was destroyed already
				newConnection.destroy();
			}
		})
			.on(VoiceConnectionStatus.Destroyed, () => player.stop());
		
		newConnection.subscribe(player);
		return newConnection;
	}
	return connection;
}

async function startStream()
{
	logger.log('attempting to begin a new stream with nowPlaying of ' + nowPlaying?.title ?? 'undefined');
	if (!nowPlaying)
	{
		logger.log('nowPlaying was undefined when startStream was called', WarningLevel.Error);
		return;
	}

	logger.log('current progress: ' + nowPlaying.currentProgressMs ?? '0');

	try {
		const { stream, type } = await demuxProbe(ytdl(nowPlaying.url, {
			filter: "audioonly",
			quality: "highestaudio",
			highWaterMark: 1024 * 1024 * 32, // 32MB
			begin: nowPlaying.currentProgressMs ? nowPlaying.currentProgressMs : 0,
		}));

		const resource = createAudioResource(stream, {
			inlineVolume: true,
			inputType: type,
			silencePaddingFrames: 1
		});

		player.play(resource);

		nowPlaying.timeStartedMs = +Date.now();
	}
	catch (e: any) {
		const err = e as Error;
		logger.log(err.message, WarningLevel.Error);
		logger.log(err.stack, WarningLevel.Error);
		logger.log('Could not start stream - something is wrong with the url checks up to this point', WarningLevel.Error);
		return;
	}

	const cb = (_: any, newStatus: { status: string; }) => {
		if (newStatus.status === "idle") {
			if (isReconnecting) return;
			if (!nowPlaying)
			{
				logger.log('nowPlaying was undefined when audio player finished, this should never happen', WarningLevel.Error);
			}
			else {
				advanceQueue();
			}
			player.off("stateChange", cb);
		}
	};
	player.on("stateChange", cb);
}

// returns true if there was already a song playing (i.e. we've only added to the queue)
// returns false if we had to start a stream (i.e. we were idle)
function playSong(song: SongQueueEntry, voiceChannel: VoiceBasedChannel) {
	if (nowPlaying)
	{ // queue up a song
		songQueue.push(song);
		return true;
	} else {
		const connection = getCurrentStream(voiceChannel.guild, voiceChannel.id, true);

		// should never happen
		if (!connection) return;
	
		connection.once(VoiceConnectionStatus.Ready, async () => {
			nowPlaying = song;
			startStream();
		});
		return false;
	}
}

export async function playAudioCommand(interaction: ChatInputCommandInteraction) {
	const item = interaction.options.getString('item');
	if (!item) {
		interaction.reply({ content: 'wtf (no argument)', ephemeral: true });
		return;
	}

	const member = interaction.member;

	if (!member || !(member instanceof GuildMember))
	{
		interaction.reply({ content: 'wtf (invalid user)', ephemeral: true });
		return;
	}
	
	const voiceChannel = member.voice.channel;

	if (!voiceChannel) {
		interaction.reply({ content: 'okay you clever chucklefuck, how the fuck am i supposed to know which channel to join\n\n(user must be in voice channel for this command)', ephemeral: true });
		return;
	}

	if (voiceChannel.full)
	{
		interaction.reply({ content: 'that channel is full, buddy. what can i say i\'m large and in charge', ephemeral: true });
		return;
	}

	let url: string = item;
	if (!isUrlDomain(item, 'youtube.com') && !isUrlDomain(item, 'music.youtube.com'))
	{
		if (isUrl(item))
		{
			interaction.reply({ content: 'buddy. i do NOT know wtf kind of link that is.', ephemeral: true });
			return;
		}
		else
		{
			// assume it's a search term
			const searchResults = ytsr(item, {
				limit: 20,
				pages: 1,
				safeSearch: false,
			});

			// for now, assume that they want the first (video) result
			const firstVideo = (await searchResults).items.find(i => i.type === "video") as ytsr.Video;
			url = firstVideo.url;
		}
	}

	// check if it's part of a playlist
	const playlistString = '&list=';
	const altPlaylistString = '/playlist?list=';
	const listIdx = url.indexOf(playlistString);
	const altListIdx = url.indexOf(altPlaylistString)
	const listEndIdx = url.indexOf('&', listIdx + playlistString.length);
	const altListEndIdx = url.indexOf('&', altListIdx + altPlaylistString.length);
	if (listIdx !== -1 || altListIdx !== -1) {
		let playlist: string = '';
		const isAltPlaylist = altListIdx !== -1;
		if (!isAltPlaylist) {
			playlist = url.substring(listIdx + playlistString.length, listEndIdx !== -1 ? listEndIdx : undefined);
		} else if (isAltPlaylist) {
			playlist = url.substring(altListIdx + altPlaylistString.length, altListEndIdx !== -1 ? altListEndIdx : undefined);
		}
		const playlistItems = await (ytpl(playlist, {
			limit: Infinity,
			pages: Infinity
		}));

		const numItems = playlistItems.estimatedItemCount;

		if (!isAltPlaylist) {
				const addPlaylistButton = new ButtonBuilder()
				.setCustomId('addPlaylist')
				.setLabel('Add Playlist (' + numItems + ' items)')
				.setStyle(ButtonStyle.Primary);
			
			const addSongButton = new ButtonBuilder()
				.setCustomId('addSong')
				.setLabel('Just this')
				.setStyle(ButtonStyle.Primary);
			
			const cancelButton = new ButtonBuilder()
				.setCustomId('cancel')
				.setLabel('Cancel')
				.setStyle(ButtonStyle.Secondary);
			
			const row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(addSongButton, addPlaylistButton, cancelButton);

			interaction.reply({
				content: 'this appears to be a playlist. do you want to add the whole playlist or just this song?', ephemeral: true, components: [row]
			});

			// wait for a response
			const response = await interaction.channel?.awaitMessageComponent({
				time: 30000,
			});

			if (!response) {
				interaction.editReply({ content: 'you took too long, i\'m not waiting for you anymore', components: [] });
				return;
			}

			// long playlists can take a while to add, so defer the replies

			if (response.customId === 'addPlaylist') {
				response.deferReply();
				const oldQueueLength = songQueue.length;

				for (const entry of playlistItems.items) {
					const songEntry = await SongEntryFromUrl(entry.url, member, interaction.channel as TextChannel);
					songEntry.playlist = playlist;
					playSong(songEntry, voiceChannel);
				}

				await response.followUp('okay, i\'ve added ' + numItems + ' songs to the queue. please take a number (#' +
					(oldQueueLength + 1) + '-' + songQueue.length
					+ ')');
				interaction.deleteReply();
				return;
			} else if (response.customId === 'addSong') {
				response.deferReply();
				url = url.substring(0, listIdx);
				const songEntry = await SongEntryFromUrl(url, member, interaction.channel as TextChannel);
				if (playSong(songEntry, voiceChannel)) {
					await response.followUp(songEntry.title + ' has been added to the queue. please take a number (#' + (songQueue.length) + ')');
				}
				else {
					await interaction.followUp('okay, fine. i will wake up JUST so i can play ' + songEntry.title + ' for you.');
				}
				interaction.deleteReply();
				return;
			}
			else if (response.customId === 'cancel') {
				interaction.editReply({ content: 'okay, i\'m not adding anything', components: [] });
				return;
			}
		}
		else {
			const oldQueueLength = songQueue.length;

			interaction.reply('okay, i\'ve added ' + numItems + ' songs to the queue. please take a number (#' +
			(oldQueueLength + 1) + '-' + (oldQueueLength + numItems)
				+ ')');
			
			for (const entry of playlistItems.items) {
				const songEntry = await SongEntryFromUrl(entry.url, member, interaction.channel as TextChannel);
				songEntry.playlist = playlist;
				playSong(songEntry, voiceChannel);
			}
			return;
		}
	}

	const songEntry = await SongEntryFromUrl(url, member, interaction.channel as TextChannel);
	if (playSong(songEntry, voiceChannel)) {
		interaction.reply(songEntry.title + ' has been added to the queue. please take a number (#' + (songQueue.length) + ')');
	} else {
		interaction.reply('okay, fine. i will wake up JUST so i can play ' + songEntry.title + ' for you.');
	}
}

// returns true when the queue was advanced, false when the queue was empty
function advanceQueue(): boolean {
	if (songQueue.length > 0)
	{
		nowPlaying = songQueue.shift();
		startStream();
		return true;
	}
	else
	{
		const channel = nowPlaying!.interactionChannel;
		const stream = getCurrentStream(channel.guild, channel.id);
		nowPlaying = undefined;
		stream?.destroy();
		return false;
	}
}

export function skipCommand(interaction: ChatInputCommandInteraction) {
	if (!nowPlaying)
	{
		interaction.reply({ content: 'nothing is playing right now, so there\'s nothing to skip', ephemeral: true });
		return;
	}
	
	if (advanceQueue())
	{
		interaction.reply('okay, i\'m skipping that song');
	}
	else {
		interaction.reply({ content: 'i am slain (queue is empty)' });
	}
}

export function queueCommand(interaction: ChatInputCommandInteraction) {
	const pageSize = 10;
	if (songQueue.length === 0 || !nowPlaying)
	{
		interaction.reply({ content: 'queue machine broke (empty queue)', ephemeral: true });
		return;
	}

	const page = interaction.options.getInteger('page') ?? 1;

	const curSongProgressSeconds = (+Date.now() - nowPlaying.timeStartedMs!) / 1000;
	let runtimeSeconds = nowPlaying.lengthMs / 1000 - curSongProgressSeconds;
	const queue = songQueue.map((song, index) => {
		const timeToHere = runtimeSeconds;
		runtimeSeconds += song.lengthMs / 1000;
		if (index === 0)
		{
			return '';
		}

		if (index < (page - 1) * pageSize || index >= page * pageSize)
		{
			return '';
		}

		// display songs in format [-hh:mm:ss] #. title (hh:mm:ss)
		return '[-' + getTimeFromSeconds(timeToHere) + '] ' + (index + 1) + '. ' + song.title + ' (' + getTimeFromSeconds(song.lengthMs / 1000) + ')';
	}).filter(item => item.length > 0).join('\n');

	// build embed for "on-deck" song and queue
	const embed = new EmbedBuilder().setFooter({
		text: 'Page ' + page + ' of ' + Math.ceil(songQueue.length / 10)
	});

	if (page === 1)
	{
		embed.setTitle('On Deck (in ' + getTimeFromSeconds(nowPlaying.lengthMs / 1000 - curSongProgressSeconds) + ')')
			.setDescription('1. ' + songQueue[0].title + ' (' + getTimeFromSeconds(songQueue[0].lengthMs / 1000) + ')')
			.setURL(songQueue[0].url)
			.setThumbnail(songQueue[0].thumbnailUrl)
			.setAuthor({
				name: songQueue[0].authorName,
				iconURL: songQueue[0].authorAvatarUrl,
				url: songQueue[0].authorUrl
			});
		
		if (queue.length > 0) 
		{
			embed.addFields([
				{
					name: 'Queue',
					value: queue,
					inline: false
				}
			])
		}
	} else {
		embed.setTitle('Queue (' + Math.min(page * pageSize, songQueue.length) + ' / ' + songQueue.length + ')')
			.setDescription(queue);
	}

	interaction.reply({ embeds: [embed] });
}

function removePlaylistSongsFromQueue(playlist: string) {
	let i = 0, j = 0;
	while (i < songQueue.length) {
		if (songQueue[i].playlist !== playlist) {
			songQueue[j++] = songQueue[i];
		}
		i++;
	}

	songQueue.length = j;
}

export function nowPlayingCommand(interaction: ChatInputCommandInteraction) {
	if (!nowPlaying)
	{
		interaction.reply({ content: 'nothing'});
		return;
	}

	const songLengthSeconds = nowPlaying.lengthMs / 1000;
	const songProgressSeconds = (+Date.now() - nowPlaying.timeStartedMs!) / 1000;

	const progressBarSize = 25;
	const progressBar = [...'='.repeat(progressBarSize)];
	progressBar[Math.floor(songProgressSeconds / songLengthSeconds * progressBarSize)] = '>';

	const embed = new EmbedBuilder()
		.setTitle(nowPlaying.title)
		.setURL(nowPlaying.url)
		.setImage(nowPlaying.thumbnailUrl)
		.setAuthor({
			name: nowPlaying.authorName,
			iconURL: nowPlaying.authorAvatarUrl,
			url: nowPlaying.authorUrl
		})
		.setFooter({
			text: 'Requested by ' + nowPlaying.requestedBy.displayName
		})
		.setDescription('Length: ' + getTimeFromSeconds(nowPlaying.lengthMs / 1000) + ' | ' +
			'Time left: ' + getTimeFromSeconds(songLengthSeconds - songProgressSeconds) + '\n' +
			// display progress bar
			'[' + progressBar.join('') + ']')
		.setTimestamp(nowPlaying.timeStartedMs!)
		.setColor(Colors.Red);
	
	interaction.reply({ embeds: [embed] });
}

export async function removeCommand(interaction: ChatInputCommandInteraction) {
	const item = interaction.options.getString('item') ?? '';
	const index = parseInt(item);

	if (Number.isNaN(index)) {
		interaction.reply({ content: 'that is not a valid number (support for this coming eventually)', ephemeral: true });
		return;
	}

	if (index < 0 || index > songQueue.length)
	{
		interaction.reply({ content: 'gross. bad number. go to jail', ephemeral: true });
		return;
	}

	if (index === 0)
	{
		if (nowPlaying?.playlist)
		{
			const yesButton = new ButtonBuilder()
				.setCustomId('removePlaylist')
				.setLabel('Yes')
				.setStyle(ButtonStyle.Danger);
			const noButton = new ButtonBuilder()
				.setCustomId('removeSingle')
				.setLabel('No')
				.setStyle(ButtonStyle.Success);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

			const response = await interaction.reply({
				content: 'That song appears to be part of a playlist. Do you want to remove the entire playlist?',
				components: [row],
				ephemeral: true
			});


			try {
				const confirmation = await response.awaitMessageComponent({ time: 30000 });
				if (confirmation.customId === 'removePlaylist')
				{
					// remove all songs from queue that are part of the playlist
					const oldSize = songQueue.length;
					removePlaylistSongsFromQueue(nowPlaying.playlist);
					interaction.followUp({ content: 'I removed ' + (oldSize - songQueue.length) + ' songs from the queue.' });
					//skipCommand(interaction);
				}
				else {
					// assume they meant to not do that
					advanceQueue();
				}
			}
			catch (e)
			{
				interaction.editReply({ content: 'You took too long to respond. I\'m not removing the playlist OR the song. fucko.', components: [] });
				return;
			}
			return;
		}
		else
		{
			skipCommand(interaction);
			return;
		}
	}

	const removed = songQueue.splice(index - 1, 1);

	if (removed[0].playlist) {
		const yesButton = new ButtonBuilder()
				.setCustomId('removePlaylist')
				.setLabel('Yes')
				.setStyle(ButtonStyle.Danger);
			const noButton = new ButtonBuilder()
				.setCustomId('removeSingle')
				.setLabel('No')
				.setStyle(ButtonStyle.Secondary);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

			const response = await interaction.reply({
				content: 'That song appears to be part of a playlist. Do you want to remove the entire playlist?',
				components: [row],
				ephemeral: true
			});

			try {
				const confirmation = await response.awaitMessageComponent({ time: 30000 });
				if (confirmation.customId === 'removePlaylist')
				{
					// remove all songs from queue that are part of the playlist
					const skipCurrent = nowPlaying?.playlist === removed[0].playlist;
					const oldSize = songQueue.length + 1 + (skipCurrent ? 1 : 0);
					removePlaylistSongsFromQueue(removed[0].playlist);
					confirmation.reply({ content: 'I removed ' + (oldSize - songQueue.length) + ' songs from the queue. bitch' });
					interaction.deleteReply();
					// also check if the current song is part of that playlist
					if (skipCurrent)
					{
						advanceQueue();
					}
					return;
				}
				else {
					// nothing more needs to be done here
					confirmation.reply({ content: 'ok. i\'m not removing the playlist. i\'m just removing the song. i promise', ephemeral: true });
				}
			}
			catch (e)
			{
				interaction.editReply({ content: 'You took too long to respond. I\'m not removing the playlist OR the song. fucko', components: [] });
				return;
			}
			return;
	}
	interaction.reply('i took ' + removed[0].title + ' outta the lineup boss. hope you like that.');
}

export function shuffleCommand(interaction: ChatInputCommandInteraction) {
	interaction.reply({content: 'this command is not yet implemented', ephemeral: true});
}

export function randomizeCommand(interaction: ChatInputCommandInteraction) {
	interaction.reply({content: 'this command is not yet implemented', ephemeral: true});
}