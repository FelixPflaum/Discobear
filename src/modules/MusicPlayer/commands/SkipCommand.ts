import type { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../../../Discordbot/BotCommandBase";
import type { VoiceManager } from "../../../Discordbot/VoiceManager";
import { L } from "../../../lang/language";
import { PlayerInstance } from "../PlayerInstance";

export class SkipCommand extends BotCommandBase {
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager) {
        super("skip", L("Skip currently playing song."));
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

        const skipped = player.skip();
        if (skipped) {
            this.replySuccess(interaction, L("Skipping `{name}`", { name: skipped.name }));
            return;
        }
        this.replyError(interaction, L("Nothing is playing."));
    }
}
