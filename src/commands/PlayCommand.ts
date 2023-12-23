import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";
import { processInput } from "../searcher";
import { Logger } from "../Logger";
import { VoiceManager } from "../Discordbot/VoiceManager";

export class PlayCommand extends BotCommandBase
{
    private readonly logger: Logger;
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager)
    {
        super("play", "Play or queue music.");
        this.voiceManager = voiceManager;
        this.addStringOption("search_or_url", "Search term or video URL.", 4, 250);
        this.logger = new Logger("PlayCommand");
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
        const searchOrURL = interaction.options.getString("search_or_url");

        if (!player)
        {
            await this.replyError(interaction, "Bot seems to be broken lel.");
            return;
        }

        if (!searchOrURL)
        {
            await this.replyError(interaction, "Missing search term!");
            return;
        }

        await interaction.deferReply();

        try
        {
            const searchResult = await processInput(searchOrURL, {
                displayName: interaction.user.displayName,
                userName: interaction.user.username
            });

            if (!searchResult)
            {
                await this.replyError(interaction, "No video results for: " + searchOrURL);
                return;
            }

            if (Array.isArray(searchResult))
            {
                if (searchResult.length == 0)
                {
                    await this.replyError(interaction, "Playlist has no valid videos!");
                    return;
                }
                player.enqueue(searchResult);
                await this.replySuccess(interaction, `Added ${searchResult.length} songs from a playlist: ${searchOrURL}`);
            }
            else
            {
                const queueSize = player.getQueueSize();
                // TODO: make duration till end
                const queueDuration = player.getQueueDuration();
                const playNow = player.enqueue(searchResult);

                // TODO: Duration time format. 

                if (playNow)
                {
                    await this.replySuccess(interaction, `Will begin playing \`${searchResult.name}\` [${searchResult.duration}].`);
                }
                else
                {
                    await this.replySuccess(interaction, `Qeueue \`${searchResult.name}\` [${searchResult.duration}], will play in ${queueDuration} (${queueSize} ahead in queue)`);
                }
            }
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
        }
    }
}
