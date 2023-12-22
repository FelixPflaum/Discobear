import { VoiceConnectionStatus, entersState, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import { Logger } from "../Logger";

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
    private voiceChannelId: string | undefined;
    private onDestroyCallbacks: (() => void)[] = [];

    constructor(voicechannel: VoiceBasedChannel)
    {
        this.logger = new Logger("MusicPlayer|" + voicechannel.guild.name);
        this.guildId = voicechannel.guildId;
        this.updateChannel(voicechannel);
        this.createConnection(voicechannel);
    }

    /**
     * Create voice connection.
     * @param voicechannel 
     */
    private createConnection(voicechannel: VoiceBasedChannel)
    {
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
        this.voiceChannelId = voiceChannel.id;
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

        getVoiceConnection(this.guildId)?.destroy();

        for (const cb of this.onDestroyCallbacks)
        {
            cb();
        }
    }
}
