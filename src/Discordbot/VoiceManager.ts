import { Client, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import { MusicPlayer } from "../MusicPlayer/MusicPlayer";
import { Logger } from "../Logger";

export class VoiceManager
{
    private readonly activePlayers: Map<string, MusicPlayer>;
    private readonly logger: Logger;

    constructor(client: Client)
    {
        this.logger = new Logger("VoiceManager");
        this.activePlayers = new Map<string, MusicPlayer>();

        // Manually track voice channel activity.
        // VoiceConnection does NOT provide its current channel, so this seems to be needed.
        client.on("voiceStateUpdate", (oldState, newState) =>
        {
            const guildId = oldState.guild.id;
            const musicplayer = this.activePlayers.get(guildId);

            if (!client.user || !musicplayer)
                return;

            // State change is for a connection from the bot.
            if (oldState.id == client.user.id)
            {
                if (newState.channel)
                    musicplayer.updateChannel(newState.channel);
                return;
            }

            // Handle other users leaving or joining a channel with the bot in it.
            if (oldState.channel && musicplayer.isInChannel(oldState.channel))
            {
                musicplayer.updateChannel(oldState.channel);
            }
            else if (newState.channel && musicplayer.isInChannel(newState.channel))
            {
                musicplayer.updateChannel(newState.channel);
            }
        });
    }

    /**
     * Check if bot is not in use in guild.
     * @param guildId 
     * @returns 
     */
    isBotFree(guildId: string)
    {
        return !this.activePlayers.has(guildId);
    }

    /**
     * Return MusicPlayer in bot is currently in this channel.
     * @param voicechannel 
     * @returns 
     */
    getBotForChannel(voicechannel: VoiceBasedChannel)
    {
        const musicplayer = this.activePlayers.get(voicechannel.guildId);
        if (musicplayer && musicplayer.isInChannel(voicechannel))
            return musicplayer;
        return;
    }

    /**
     * Return MusicPlayer for guild if it exists.
     * @param guildId 
     * @returns 
     */
    getBotForGuild(guildId: string)
    {
        return this.activePlayers.get(guildId);
    }

    /**
     * Create player for voice channel and attempt to connect.
     * @param voicechannel 
     * @returns MusicPlayer instance if connection was successful or player already existed for this channel.
     */
    async joinVoice(voicechannel: VoiceBasedChannel, textchanel: TextBasedChannel)
    {
        const guildId = voicechannel.guild.id;

        if (!this.isBotFree(guildId))
            return this.getBotForChannel(voicechannel);

        this.logger.log(`Adding MusicPlayer for guild ${voicechannel.guild.name} (${guildId}).`);

        const musicplayer = new MusicPlayer(guildId, voicechannel.guild.name, textchanel);
        this.activePlayers.set(guildId, musicplayer);

        musicplayer.onDestroy(() =>
        {
            this.logger.log(`Removing MusicPlayer for guild ${voicechannel.guild.name} (${guildId}).`);
            this.activePlayers.delete(musicplayer.guildId);
        });

        if (!await musicplayer.connectToVoice(voicechannel))
        {
            musicplayer.destroy();
            return;
        }
        return musicplayer;
    }

    /**
     * Destroy all active players.
     */
    destroy()
    {
        for (const player of this.activePlayers.values())
        {
            player.destroy();
        }
    }
}