import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";
import { VoiceManager } from "../Discordbot/VoiceManager";

export class StopCommand extends BotCommandBase
{
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager)
    {
        super("stop", "Stop playback and clear queue.");
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

        if (player.stop())
        {
            this.replySuccess(interaction, "Stopped playback and cleared queue.");
            return;
        }
        this.replyError(interaction, "Nothing is playing.");
    }
}
