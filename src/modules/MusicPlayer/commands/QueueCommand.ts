import { EmbedBuilder } from "discord.js";
import type { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../../../Discordbot/BotCommandBase";
import type { VoiceManager } from "../../../Discordbot/VoiceManager";
import { hhmmss } from "../../../helper";
import type { Song } from "../Song";
import { L } from "../../../lang/language";
import { PlayerInstance } from "../PlayerInstance";

export class QueueCommand extends BotCommandBase {
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager) {
        super("queue", L("Show next songs in queue."));
        this.voiceManager = voiceManager;
    }

    /**
     * Build the queue info embed.
     * @param size
     * @param duration
     * @param songs
     * @returns
     */
    private buildQueueEmbed(size: number, duration: number, songs: Song[]) {
        const embed = new EmbedBuilder()
            .setColor("#2fa9a9")
            .setTitle(L("Upcoming in queue"))
            .setDescription(L("Total in queue: {size}  |  Playing time: {dur}", { size: size, dur: hhmmss(duration) }));

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i]!;
            embed.addFields({
                name: `${i + 1}. ${song.name}`,
                value: L("[{dur}]  Added by *{addedby}*", {
                    dur: hhmmss(song.duration),
                    addedby: song.requester.displayName,
                }),
                inline: false,
            });
        }

        return embed;
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const guildId = interaction.guildId;
        if (!guildId) {
            await this.replyError(interaction, L("You're not in a guild!"));
            return;
        }

        const player = this.voiceManager.getBotForGuild(guildId);
        if (!player || !PlayerInstance.isInstance(player) || player.getQueueSize() == 0) {
            await this.replyError(interaction, L("I'm not playing anything right now."));
            return;
        }

        const size = player.getQueueSize();
        const duration = player.getQueueDuration();
        const list = player.getNextSongs(5);
        const embed = this.buildQueueEmbed(size, duration, list);
        await this.interactionReply(interaction, "", [embed]);
    }
}
