import { ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildMember, TextChannel } from "discord.js";
import { Logger, WarningLevel } from "./logger";
import { MoronModule } from "./moronmodule";
import { AudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, StreamType, VoiceConnectionDisconnectReason, VoiceConnectionStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import ytdl from "ytdl-core";
import { delay, getTimeFromSeconds, isUrlDomain } from "./util";
import isUrl from "is-url";

const devMode: boolean = true;

const logger: Logger = new Logger('bard', devMode ? WarningLevel.Info : WarningLevel.Warning);

export const Bard: MoronModule = {
	name: 'bard',
	onInit: bard_Init,
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
}

async function SongEntryFromUrl(url: string, requestedBy: GuildMember, interactionChannel: TextChannel): Promise<SongQueueEntry>
{
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

let isReconnecting: boolean = false;

const songQueue: SongQueueEntry[] = [];

let discordClient: Client<boolean>;
let nowPlaying: SongQueueEntry | undefined = undefined;

function bard_Init(client: Client<boolean>) {
	discordClient = client;
}

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

	logger.log('current progress: ' + nowPlaying.currentProgressMs ?? 'undefined');

	const { stream, type } = await demuxProbe(ytdl(nowPlaying.url, {
		filter: "audioonly",
		quality: "highestaudio",
		highWaterMark: 1 << 25,
		begin: nowPlaying.currentProgressMs ? nowPlaying.currentProgressMs : 0,
	}));

	nowPlaying.timeStartedMs = +Date.now();

	const resource = createAudioResource(stream, {
		inlineVolume: true,
		inputType: type,
		silencePaddingFrames: 1
	});
	player.play(resource);
	const cb = (_: any, newStatus: { status: string; }) => {
		if (newStatus.status === "idle") {
			if (isReconnecting) return;
			if (!nowPlaying)
			{
				logger.log('nowPlaying was undefined when audio player finished, this should never happen', WarningLevel.Error);
			}
			else {
				if (songQueue.length > 0) {
					nowPlaying = songQueue.shift();
					startStream();
				}
				else {
					const channel = nowPlaying.interactionChannel;
					channel.send({ content: "i'm done playing music now. the silence is deafening" });
					const stream = getCurrentStream(channel.guild, channel.id);
					nowPlaying = undefined;
					stream?.destroy();
				}
			}
			player.off("stateChange", cb);
		}
	};
	player.on("stateChange", cb);
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
			interaction.reply({ content: "this is not a thing yet. but someday", ephemeral: true });
			return;
		}

	}

	const url = item;

	if (nowPlaying)
	{
		// queue up a song
		interaction.reply('that has been added to the queue. please take a number (#' + (songQueue.length + 1) + ')');
		songQueue.push(await SongEntryFromUrl(url, member, interaction.channel as TextChannel));

	} else {
		const connection = getCurrentStream(voiceChannel.guild, voiceChannel.id, true);

		// should never happen
		if (!connection) return;
	
		connection.once(VoiceConnectionStatus.Ready, async () => {
			nowPlaying = await SongEntryFromUrl(url, member, interaction.channel as TextChannel);
			startStream();
		});

		interaction.reply('okay, i\'m joining the channel now, ready or not here i come');
	}

}

export function skipCommand(interaction: ChatInputCommandInteraction) {
	if (!nowPlaying)
	{
		interaction.reply({ content: 'nothing is playing right now, so there\'s nothing to skip', ephemeral: true });
		return;
	}

	if (songQueue.length > 0)
	{
		nowPlaying = songQueue.shift();
		interaction.reply('okay, i\'m skipping that song');
		startStream();
	}
	else
	{
		const channel = nowPlaying.interactionChannel;
		channel.send({ content: "i'm done playing music now. the silence is deafening" });
		const stream = getCurrentStream(channel.guild, channel.id);
		nowPlaying = undefined;
		stream?.destroy();
	}
}

export function queueCommand(interaction: ChatInputCommandInteraction) {
	const pageSize = 10;
	if (songQueue.length === 0)
	{
		interaction.reply({ content: 'queue machine broke (empty queue)', ephemeral: true });
		return;
	}

	const page = interaction.options.getInteger('page') ?? 1;

	const queue = songQueue.map((song, index) => {
		if (index === 0)
		{
			return '';
		}

		if (index < (page - 1) * pageSize || index >= page * pageSize)
		{
			return '';
		}

		// display songs in format #. title (hh:mm:ss)
		return (index + 1) + '. ' + song.title + ' (' + getTimeFromSeconds(song.lengthMs / 1000) + ')';
	}).filter(item => item.length > 0).join('\n');

	// build embed for "on-deck" song and queue
	const embed = new EmbedBuilder().setFooter({
		text: 'Page ' + page + ' of ' + Math.ceil(songQueue.length / 10)
	});

	if (page === 1)
	{
		embed.setTitle('On Deck')
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
		embed.setTitle('Queue (' + Math.max(page * pageSize, songQueue.length) + ' / ' + songQueue.length + ')')
			.setDescription(queue);
	}

	interaction.reply({ embeds: [embed] });
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
		.setColor(0xf12000);
	
	interaction.reply({ embeds: [embed] });
}

export function removeCommand(interaction: ChatInputCommandInteraction) {
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
		skipCommand(interaction);
		return;
	}

	const removed = songQueue.splice(index - 1, 1);
	interaction.reply('i took ' + removed[0].title + ' outta the lineup boss. hope you like that.');
}