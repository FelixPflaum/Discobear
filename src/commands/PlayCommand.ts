import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";
//import { processInput } from "../searcher";
//import { Logger } from "../Logger";
import { VoiceManager } from "../Discordbot/VoiceManager";

export class PlayCommand extends BotCommandBase
{
    //private readonly logger: Logger;
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager)
    {
        super("play", "Play or queue music.");
        this.voiceManager = voiceManager;
        this.addStringOption("search_or_url", "Search term or video URL.", 4, 250);
        //this.logger = new Logger("PlayCommand");
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>)
    {
        const guildId = interaction.guildId;
        const voicechannel = this.voiceManager.getInteractionVoicechannel(interaction);

        if (!voicechannel || !guildId)
        {
            await this.replyError(interaction, "You're not in a voice channel!");
            return;
        }

        if (!this.voiceManager.isBotFree(guildId)
            && !this.voiceManager.isBotInSameChannel(voicechannel))
        {
            await this.replyError(interaction, "Bot is already in use in another channel!");
            return;
        }

        const player = this.voiceManager.joinVoice(voicechannel);

        if (!player)
        {
            await this.replyError(interaction, "Bot seems to be broken lel.");
            return;
        }

        /* const searchOrURL = interaction.options.getString("search_or_url");
        if (!searchOrURL)
        {
            await this.replyError(interaction, "Missing search term!");
            return;
        }

        await interaction.deferReply();

        try
        {
            const searchResult = await processInput(searchOrURL);

            if (!searchResult)
            {
                await this.replyError(interaction, "No video results for: " + searchOrURL);
                return;
            }

            if (Array.isArray(searchResult))
            {
                if (searchResult.length === 0)
                {
                    await this.replyError(interaction, "Playlist has no valid videos!");
                    return;
                }
                // TODO: queue/play playlist
                return;
            }

            // TODO: queue/play song
        }
        catch (error)
        {
            if (typeof error === "string")
            {
                await this.replyError(interaction, error);
                return;
            }
            this.logger.logError("Unexpected error on search!", error);
            await this.replyError(interaction, "Unexpected error!");
        } */
    }
}
