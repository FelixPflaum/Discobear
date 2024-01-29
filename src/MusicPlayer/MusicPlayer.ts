import
{
    AudioPlayer, AudioPlayerStatus, AudioResource, NoSubscriberBehavior, VoiceConnectionStatus,
    createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel
} from "@discordjs/voice";
import { Embed, EmbedBuilder, MessageCreateOptions, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import { Logger } from "../Logger";
import { SongQueue } from "./SongQueue";
import { Song } from "./Song";
import { stream } from "play-dl";
import { buildNowPlayingEmbed } from "./playembed";
import { L } from "../lang/language";

const enum LeaveReason
{
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
    CHANNEL_EMPTY = "CHANNEL_EMPTY",
    IDLE_TIMEOUT = "IDLE_TIMEOUT",
}

const leaveDelay = {
    [LeaveReason.CHANNEL_EMPTY]: 5000,
    [LeaveReason.CONNECTION_TIMEOUT]: 10000,
    [LeaveReason.IDLE_TIMEOUT]: 30000
}

export class MusicPlayer
{
    readonly guildId: string;
    private readonly logger: Logger;
    private readonly leaveTimer: { [index: string]: NodeJS.Timeout } = {};
    private readonly queue: SongQueue;
    private readonly audioPlayer: AudioPlayer;
    private voiceChannelId: string | undefined;
    private onDestroyCallbacks: (() => void)[] = [];
    private nowPlaying?: { song: Song, startedAt: number };
    private retryCounter = 0;
    private textchannel: TextBasedChannel;

    constructor(guildId: string, guildName: string, textchannel: TextBasedChannel)
    {
        this.logger = new Logger("MusicPlayer|" + guildName);
        this.queue = new SongQueue();
        this.audioPlayer = this.setupAudioPlayer();
        this.guildId = guildId;
        this.textchannel = textchannel;
    }

    /**
     * Send message to text channel if possible. Handles rejections.
     * @param msg 
     * @param embeds 
     * @returns Promise containing the Message if sent successfully.
     */
    private async sendText(msg: string, embeds?: (Embed | EmbedBuilder)[])
    {
        if (!this.textchannel)
            return;

        const payload: MessageCreateOptions = { content: msg };
        if (embeds) payload.embeds = embeds;

        try
        {
            return await this.textchannel.send(payload);
        }
        catch (error)
        {
            this.logger.logError("Failed to send message to text channel!", error);
            return;
        }
    }

    /**
     * Create AudioPlayer.
     */
    private setupAudioPlayer()
    {
        if (this.audioPlayer)
            return this.audioPlayer;

        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });

        let finished = false;

        player.on("error", error =>
        {
            this.logger.logError("Player error!", error);

            if (finished) return;
            finished = true;

            this.retryCounter++;
            if (this.retryCounter > 2 || !this.nowPlaying)
            {
                this.logger.logError("Stream failed and couldn't restart, skipping!", this.nowPlaying?.song.url);
                this.playNext();
                return;
            }

            setTimeout(() =>
            {
                if (this.nowPlaying)
                    this.playSong(this.nowPlaying.song)
            }, 2500);
        });

        player.on(AudioPlayerStatus.AutoPaused, () =>
        {
            this.logger.log("Player went into auto pause");
        });

        player.on(AudioPlayerStatus.Playing, async () => 
        {
            this.setSelfdestructTimer(LeaveReason.IDLE_TIMEOUT, false);
            finished = false;
        });

        player.on(AudioPlayerStatus.Idle, () => 
        {
            if (finished) return;
            finished = true;
            delete this.nowPlaying;
            this.setSelfdestructTimer(LeaveReason.IDLE_TIMEOUT, true);
            this.playNext();
        });

        return player;
    }

    /**
     * Create voice connection.
     * @param voicechannel 
     * @returns True if connection was successfully established in 5s.
     */
    async connectToVoice(voicechannel: VoiceBasedChannel)
    {
        if (getVoiceConnection(this.guildId))
            return true

        this.logger.log("Creating voice connection.");

        const connection = joinVoiceChannel({
            guildId: this.guildId,
            channelId: voicechannel.id,
            adapterCreator: voicechannel.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        connection.on(VoiceConnectionStatus.Disconnected, async (_oldState, _newState) =>
        {
            try
            {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            }
            catch (error)
            {
                this.destroy();
            }
        });

        connection.on("error", error =>
        {
            this.logger.logError("Voice connection error!", error);
            this.destroy();
        });

        this.setSelfdestructTimer(LeaveReason.CONNECTION_TIMEOUT, true);

        connection.on(VoiceConnectionStatus.Ready, () =>
        {
            this.logger.log("Voice connection established.");
            this.setSelfdestructTimer(LeaveReason.CONNECTION_TIMEOUT, false);
            this.setSelfdestructTimer(LeaveReason.IDLE_TIMEOUT, true);
        });

        connection.subscribe(this.audioPlayer);

        this.updateChannel(voicechannel);

        try
        {
            await entersState(connection, VoiceConnectionStatus.Ready, 5000);
        }
        catch (error)
        {
            return false;
        }
        return true;
    }

    /**
     * Set or reset self destruct timer.
     * @param reason 
     * @param active 
     */
    private setSelfdestructTimer(reason: LeaveReason, active: boolean)
    {
        clearTimeout(this.leaveTimer[reason]);
        delete this.leaveTimer[reason];
        if (active)
            this.leaveTimer[reason] = setTimeout(() =>
            {
                this.logger.log("Self destruction, reason: " + reason);
                this.destroy();
            }, leaveDelay[reason]);
    }

    /**
     * Play song.
     * @param song 
     * @returns 
     */
    private async playSong(song: Song)
    {
        const connection = getVoiceConnection(this.guildId);
        if (!connection)
        {
            this.sendText(L("Voice connection lost!"));
            this.destroy();
            return;
        }

        let audio: AudioResource;

        try
        {
            const playStream = await stream(song.url, { discordPlayerCompatibility: true });
            audio = createAudioResource(playStream.stream);
        }
        catch (error)
        {
            // ffmpeg is not installed, or another unrecoverable problem with yt exists.
            this.sendText(L("Unable to create stream!"));
            this.destroy();
            this.logger.logError("Error on creating yt stream! Is ffmpeg installed?", error);
            return;
        }

        this.audioPlayer.play(audio);

        this.nowPlaying = {
            song: song,
            startedAt: Date.now() / 1000
        }

        const next = this.queue.getSongList(1);
        this.sendText("", [buildNowPlayingEmbed(song, next[0])]);
    }

    /**
     * Play next song if queue isn't empty.
     */
    private playNext()
    {
        if (!getVoiceConnection(this.guildId))
        {
            this.sendText(L("Voice connection lost!"));
            this.destroy();
            return;
        }

        this.retryCounter = 0;
        const next = this.queue.getNext();
        if (next)
            this.playSong(next);
        else
            this.sendText(L("Nothing left to play, going back to sleep."));
    }

    /**
     * Enqueue song or array of songs.
     * @param songOrSongs 
     * @returns True if song will play immedeately.
     */
    enqueue(songOrSongs: Song | Song[]): boolean
    {
        if (Array.isArray(songOrSongs))
        {
            for (const song of songOrSongs)
            {
                this.queue.add(song);
            }
        }
        else
        {
            this.queue.add(songOrSongs);
        }

        if (!this.nowPlaying)
        {
            this.playNext();
            return true;
        }

        return false;
    }

    /**
     * Skip current song. Stops playback if queue is empty.
     * @returns True if something was skipped.
     */
    skip()
    {
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle)
            return;
        const wasPlaying = this.nowPlaying?.song;
        this.audioPlayer.stop();
        return wasPlaying;
    }

    /**
     * Stop playback and empty queue.
     * @returns True is something was playing.
     */
    stop()
    {
        const wasPlaying = !!this.nowPlaying;
        this.queue.clear();
        this.skip();
        return wasPlaying;
    }

    /**
     * Get current queue size.
     * @returns 
     */
    getQueueSize()
    {
        return this.queue.getSize();
    }

    /**
     * Get current queue duration. Including currently playing song.
     * @returns 
     */
    getQueueDuration()
    {
        let currentRemaining = 0;
        if (this.nowPlaying)
        {
            const now = Date.now() / 1000;
            const currentEndsAt = this.nowPlaying.startedAt + this.nowPlaying.song.duration;
            currentRemaining = Math.max(0, currentEndsAt - now);
            currentRemaining = Math.round(currentRemaining);
        }
        return this.queue.getDuration() + currentRemaining;
    }

    /**
     * Get array of up to count next songs in queue.
     * @param count 
     * @returns 
     */
    getNextSongs(count: number)
    {
        return this.queue.getSongList(count);
    }

    /**
     * Register callback for when this player destroys itself.
     * @param cb 
     */
    onDestroy(cb: () => void)
    {
        this.onDestroyCallbacks.push(cb);
    }

    /**
     * Use this to make sure bot doesn't peace out while it'll probably be needed in a momenent.
     */
    preventLeave()
    {
        if (this.leaveTimer[LeaveReason.IDLE_TIMEOUT])
            this.setSelfdestructTimer(LeaveReason.IDLE_TIMEOUT, true);
    }

    /**
     * Check if this player in in specific channel.
     * @param voicechannel 
     * @returns 
     */
    isInChannel(voicechannel: VoiceBasedChannel)
    {
        return voicechannel.id == this.voiceChannelId;
    }

    /**
     * Update channel for this player.
     * @param voiceChannel 
     */
    updateChannel(voiceChannel: VoiceBasedChannel)
    {
        if (this.voiceChannelId != voiceChannel.id)
        {
            this.logger.log("Was moved to new channel: " + voiceChannel.name);
            this.voiceChannelId = voiceChannel.id;
        }
        this.setSelfdestructTimer(LeaveReason.CHANNEL_EMPTY, voiceChannel.members.size < 2);
    }

    /**
     * Destroy player.
     */
    destroy()
    {
        this.logger.log("Destroying myself :(");

        for (const reason in this.leaveTimer)
        {
            clearTimeout(this.leaveTimer[reason]);
        }

        this.audioPlayer.stop(true);

        getVoiceConnection(this.guildId)?.destroy();

        for (const cb of this.onDestroyCallbacks)
        {
            cb();
        }
    }
}
