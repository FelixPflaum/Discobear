import { ChatInputCommandInteraction, CacheType, EmbedBuilder } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";
import { VoiceManager } from "../Discordbot/VoiceManager";
import { hhmmss } from "../helper";
import { Song } from "../MusicPlayer/Song";

export class QueueCommand extends BotCommandBase
{
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager)
    {
        super("queue", "Show next songs in queue.");
        this.voiceManager = voiceManager;
    }

    /**
     * Build the queue info embed.
     * @param size 
     * @param duration 
     * @param songs 
     * @returns 
     */
    private buildQueueEmbed(size: number, duration: number, songs: Song[])
    {
        const embed = new EmbedBuilder()
            .setColor("#2fa9a9")
            .setTitle("Upcoming in queue")
            .setDescription(`Total in queue: ${size}  |  Playing time: ${hhmmss(duration)}`);

        for (let i = 0; i < songs.length; i++)
        {
            const song = songs[i]!;
            embed.addFields({
                name: `${i + 1}. ${song.name}`,
                value: `[${hhmmss(song.duration)}]  Added by *${song.requester.displayName}*`,
                inline: false
            });
        }

        return embed;
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>)
    {
        const guildId = interaction.guildId;
        if (!guildId)
        {
            await this.replyError(interaction, "You're not in a guild!");
            return;
        }

        const player = this.voiceManager.getBotForGuild(guildId);
        if (!player || player.getQueueSize() == 0)
        {
            await this.replyError(interaction, "I'm not playing anything right now.");
            return;
        }

        const size = player.getQueueSize();
        const duration = player.getQueueDuration();
        const list = player.getNextSongs(5);
        const embed = this.buildQueueEmbed(size, duration, list);
        await this.interactionReply(interaction, "", [embed]);
    }
}
