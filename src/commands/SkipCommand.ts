import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";
import { VoiceManager } from "../Discordbot/VoiceManager";

export class SkipCommand extends BotCommandBase
{
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager)
    {
        super("skip", "Skip currently playing song.");
        this.voiceManager = voiceManager;
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>)
    {
        const guildId = interaction.guildId;
        const voicechannel = this.getInteractionVoicechannel(interaction);

        if (!voicechannel || !guildId)
        {
            await this.replyError(interaction, "You're not in a voice channel!");
            return;
        }

        const player = this.voiceManager.getBotForChannel(voicechannel);
        if (!player)
        {
            await this.replyError(interaction, "You are not in a channel with me!");
            return;
        }

        const skipped = player.skip();
        if (skipped)
        {
            this.replySuccess(interaction, `Skipping \`${skipped.name}\``);
            return;
        }
        this.replyError(interaction, "Nothing is playing.");
    }
}
