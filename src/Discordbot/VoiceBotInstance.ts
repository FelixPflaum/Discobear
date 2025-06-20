import { Embed, EmbedBuilder, Guild, MessageCreateOptions, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import { Logger } from "../Logger";
import {
    AudioPlayer,
    AudioPlayerError,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { L } from "../lang/language";
import { Readable } from "node:stream";

type VoiceBotInstanceEvents = {
    destroy: (() => void)[];
    /**
     * Called when AudioPlayer has an error.
     * @param error
     */
    playerError: ((error: AudioPlayerError) => void)[];
    /**
     * Called when player pauses due to channel being empty.
     */
    playerAutoPause: (() => void)[];
    /**
     * Called when player starts playing.
     */
    playerPlaying: (() => void)[];
    /**
     * Called when playback stream ends.
     */
    playerIdle: (() => void)[];
};

const enum LeaveReason {
    ConnectionTimeout = "CONNECTION_TIMEOUT",
    ChannelEmpty = "CHANNEL_EMPTY",
    IdleTimeout = "IDLE_TIMEOUT",
}

const LEAVE_DELAY = {
    [LeaveReason.ChannelEmpty]: 5000,
    [LeaveReason.ConnectionTimeout]: 10000,
    [LeaveReason.IdleTimeout]: 30000,
};

export class VoiceBotInstance {
    readonly guildId: string;
    readonly guildName: string;
    readonly moduleTypeId: string;
    readonly logger: Logger;

    private currentChannelId: string | undefined;

    private readonly selfDeafen: boolean;
    private readonly textchannel: TextBasedChannel;
    private readonly eventCallbacks: VoiceBotInstanceEvents = {
        destroy: [],
        playerError: [],
        playerAutoPause: [],
        playerPlaying: [],
        playerIdle: [],
    };
    private readonly leaveTimer: { [index: string]: NodeJS.Timeout } = {};
    private readonly audioPlayer: AudioPlayer;

    constructor(moduleTypeId: string, guild: Guild, textchannel: TextBasedChannel, selfDeafen = true) {
        this.moduleTypeId = moduleTypeId;
        this.guildId = guild.id;
        this.guildName = guild.name;
        this.textchannel = textchannel;
        this.selfDeafen = selfDeafen;

        this.logger = new Logger(`VoiceInstance|${moduleTypeId}|${guild.name}`);
        this.audioPlayer = this.setupAudioPlayer();
    }

    /**
     * Set or reset self destruct timer.
     * @param reason
     * @param active
     */
    private setSelfdestructTimer(reason: LeaveReason, active: boolean) {
        clearTimeout(this.leaveTimer[reason]);
        delete this.leaveTimer[reason];
        if (active)
            this.leaveTimer[reason] = setTimeout(() => {
                this.logger.log("Self destruction, reason: " + reason);
                this.destroy();
            }, LEAVE_DELAY[reason]);
    }

    /**
     * Send message to text channel if possible. Handles rejections.
     * @param msg
     * @param embeds
     * @returns Promise containing the Message if sent successfully.
     */
    async sendText(msg: string, embeds?: (Embed | EmbedBuilder)[]) {
        if (!this.textchannel || !this.textchannel.isSendable()) return;

        const payload: MessageCreateOptions = { content: msg };
        if (embeds) payload.embeds = embeds;

        try {
            return await this.textchannel.send(payload);
        } catch (error) {
            this.logger.logError("Failed to send message to text channel!", error);
            return;
        }
    }

    /**
     * Check if player is in given channel.
     * @param channel
     * @returns
     */
    isInChannel(channel: VoiceBasedChannel): boolean {
        return !!this.currentChannelId && this.currentChannelId == channel.id;
    }

    /**
     * Update channel for this voice instance.
     * @param voiceChannel
     */
    updateChannel(voiceChannel: VoiceBasedChannel) {
        if (this.currentChannelId != voiceChannel.id) {
            this.logger.log("Was moved to new channel: " + voiceChannel.name);
            this.currentChannelId = voiceChannel.id;
        }
        this.setSelfdestructTimer(LeaveReason.ChannelEmpty, voiceChannel.members.size < 2);
    }

    addEventListener<T extends keyof VoiceBotInstanceEvents>(event: T, callback: VoiceBotInstanceEvents[T][0]): void {
        const cbArray = this.eventCallbacks[event];
        if (cbArray.find((v) => v == callback)) throw new Error("Callback already registered for event!");
        // @ts-expect-error
        cbArray.push(callback);
    }

    /**
     * Destroy voice instance.
     */
    destroy(): void {
        this.logger.log("Destroying myself :(");

        for (const reason in this.leaveTimer) {
            clearTimeout(this.leaveTimer[reason]);
        }

        this.audioPlayer.stop(true);

        getVoiceConnection(this.guildId)?.destroy();

        for (const cb of this.eventCallbacks.destroy) cb();
    }

    /**
     * Create AudioPlayer.
     */
    private setupAudioPlayer() {
        if (this.audioPlayer) return this.audioPlayer;

        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });

        player.on("error", (error) => {
            this.logger.logError("AudioPlayer error!", error);
            for (const cb of this.eventCallbacks.playerError) cb(error);
        });

        player.on(AudioPlayerStatus.AutoPaused, () => {
            this.logger.log("Player went into auto pause");
            for (const cb of this.eventCallbacks.playerAutoPause) cb();
        });

        player.on(AudioPlayerStatus.Playing, async () => {
            this.setSelfdestructTimer(LeaveReason.IdleTimeout, false);
            for (const cb of this.eventCallbacks.playerPlaying) cb();
        });

        player.on(AudioPlayerStatus.Idle, () => {
            this.setSelfdestructTimer(LeaveReason.IdleTimeout, true);
            for (const cb of this.eventCallbacks.playerIdle) cb();
        });

        return player;
    }

    /**
     * Play stream.
     * @param stream
     * @returns
     */
    async playStream(stream: Readable) {
        const connection = getVoiceConnection(this.guildId);
        if (!connection) {
            this.sendText(L("Voice connection lost!"));
            this.destroy();
            return;
        }

        try {
            const audio = createAudioResource(stream);
            this.audioPlayer.play(audio);
        } catch (error) {
            this.sendText(L("Unable to create audio resource!"));
            this.destroy();
            this.logger.logError("Error on creating AudioResource", error);
        }
    }

    /**
     * Trigger a stop of current playback.
     * @returns
     */
    stopStream() {
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) return;
        this.audioPlayer.stop();
    }

    /**
     * Create voice connection.
     * @param voicechannel
     * @returns True if connection was successfully established in 5s.
     */
    async connectToVoice(voicechannel: VoiceBasedChannel): Promise<boolean> {
        if (getVoiceConnection(this.guildId)) return true;

        this.logger.log("Creating voice connection.");

        const connection = joinVoiceChannel({
            guildId: this.guildId,
            channelId: voicechannel.id,
            adapterCreator: voicechannel.guild.voiceAdapterCreator,
            selfDeaf: this.selfDeafen,
        });

        connection.on(VoiceConnectionStatus.Disconnected, async (_oldState, _newState) => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                this.destroy();
            }
        });

        connection.on("error", (error) => {
            this.logger.logError("Voice connection error!", error);
            this.sendText(L("Voice connection error!"));
            this.destroy();
        });

        this.setSelfdestructTimer(LeaveReason.ConnectionTimeout, true);

        connection.on(VoiceConnectionStatus.Ready, () => {
            this.logger.log("Voice connection established.");
            this.setSelfdestructTimer(LeaveReason.ConnectionTimeout, false);
            this.setSelfdestructTimer(LeaveReason.IdleTimeout, true);
        });

        connection.subscribe(this.audioPlayer);

        this.updateChannel(voicechannel);

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 5000);
        } catch (error) {
            return false;
        }
        return true;
    }
}
