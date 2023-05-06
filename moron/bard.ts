import { ChatInputCommandInteraction, Client, Guild, GuildMember, TextChannel } from "discord.js";
import { Logger, WarningLevel } from "./logger";
import { MoronModule } from "./moronmodule";
import { AudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, StreamType, VoiceConnectionDisconnectReason, VoiceConnectionStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import ytdl from "ytdl-core";
import { promisify } from "node:util";
import { delay, isUrlDomain } from "./util";
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
}

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
}).on('error', (error) => { 
	logger.log(error.message, WarningLevel.Error);
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
					newConnection.destroy();
					// probably removed from voice channel
				}
			} else if (newConnection.rejoinAttempts < 5) {
				await delay((newConnection.rejoinAttempts + 1) * 5000);
				newConnection.rejoin();
			}
			else {
				newConnection.destroy();
			}
		})
			.on(VoiceConnectionStatus.Destroyed, () => player.stop());
		
		newConnection.subscribe(player);
		return newConnection;
	}
	return connection;
}

async function startStream(url: string, channel: TextChannel)
{
	player.unpause();
	const { stream, type } = await demuxProbe(ytdl(url, {
		filter: "audioonly",
		quality: "highestaudio",
	}));
	const info = await ytdl.getInfo(url);
	channel.send({ content: `you are now listening to ${info.videoDetails.title}\n\nbitch`});
	const resource = createAudioResource(stream, {
		inlineVolume: true,
		inputType: type,
		silencePaddingFrames: 1
	});
	player.play(resource);
	const cb = (_: any, newStatus: { status: string; }) => {
		if (newStatus.status === "idle") {
			if (songQueue.length > 0) {
				nowPlaying = songQueue.shift();
				startStream(nowPlaying!.url, channel);
			}
			else {
				channel.send({ content: "i'm done playing music now. the silence is deafening" });
				const stream = getCurrentStream(channel.guild, channel.id);
				nowPlaying = undefined;
				stream?.destroy();
			}
			player.off("stateChange", cb);
		}
	};
	player.on("stateChange", cb);
}

export function playAudioCommand(interaction: ChatInputCommandInteraction) {
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

	if (nowPlaying)
	{
		// queue up a song
		songQueue.push({
			url: item,
			title: 'poopoo peepee'
		});

		interaction.reply('that has been added to the queue. please take a number (#' + songQueue.length + ')');
	} else {
		const connection = getCurrentStream(voiceChannel.guild, voiceChannel.id, true);

		// should never happen
		if (!connection) return;
	
		connection.once(VoiceConnectionStatus.Ready, async () => {
			startStream(item, interaction.channel as TextChannel);
		});

		interaction.reply('okay, i\'m joining the channel now, ready or not here i come');
		nowPlaying = {
			url: item,
			title: 'poopoo peepee'
		}
	}

}