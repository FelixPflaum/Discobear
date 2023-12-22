import { Client, ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { MusicPlayer } from "../MusicPlayer/MusicPlayer";

export class VoiceManager
{
    private readonly activePlayers: Map<string, MusicPlayer>;

    constructor(client: Client)
    {
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
     * Check if bot is in the same channel.
     * @param voicechannel 
     * @returns 
     */
    isBotInSameChannel(voicechannel: VoiceBasedChannel)
    {
        const musicplayer = this.activePlayers.get(voicechannel.guildId);
        if (musicplayer && musicplayer.isInChannel(voicechannel))
            return musicplayer;
        return;
    }

    /**
     * Get voice channel from interaction.
     * @param interaction 
     * @returns 
     */
    getInteractionVoicechannel(interaction: ChatInputCommandInteraction)
    {
        if (!interaction.guild || !interaction.member)
            return null;

        const guildMember = interaction.guild.members.cache.get(interaction.member.user.id);
        if (!guildMember)
            return null;

        return guildMember.voice.channel;
    }

    /**
     * Create player for voice channel.
     * @param voicechannel 
     * @returns 
     */
    joinVoice(voicechannel: VoiceBasedChannel)
    {
        const guildId = voicechannel.guild.id;

        if (!this.isBotFree(guildId))
            return;

        const musicplayer = new MusicPlayer(voicechannel);
        this.activePlayers.set(guildId, musicplayer);

        musicplayer.onDestroy(() =>
        {
            this.activePlayers.delete(musicplayer.guildId);
        });

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