import type { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../../../Discordbot/BotCommandBase";
import type { VoiceManager } from "../../../Discordbot/VoiceManager";
import { L } from "../../../lang/language";
import { PlayerInstance } from "../PlayerInstance";

export class StopCommand extends BotCommandBase {
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager) {
        super("stop", L("Stop playback and clear queue."));
        this.voiceManager = voiceManager;
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const guildId = interaction.guildId;
        const voicechannel = this.getInteractionVoicechannel(interaction);

        if (!voicechannel || !guildId) {
            await this.replyError(interaction, L("You're not in a voice channel!"));
            return;
        }

        const player = this.voiceManager.getBotForChannel(voicechannel);
        if (!player || !PlayerInstance.isInstance(player)) {
            await this.replyError(interaction, L("You are not in a channel with me!"));
            return;
        }

        if (player.stop()) {
            this.replySuccess(interaction, L("Stopped playback and cleared queue."));
            return;
        }
        this.replyError(interaction, L("Nothing is playing."));
    }
}
