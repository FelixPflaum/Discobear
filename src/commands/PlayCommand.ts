import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";
import { SearchData, processInput } from "../search/search";
import { VoiceManager } from "../Discordbot/VoiceManager";
import { MusicPlayer } from "../MusicPlayer/MusicPlayer";
import { hhmmss } from "../helper";

export class PlayCommand extends BotCommandBase
{
    private readonly voiceManager: VoiceManager;

    constructor(voiceManager: VoiceManager)
    {
        super("play", "Play or queue music.");
        this.voiceManager = voiceManager;
        this.addStringOption("search_or_url", "Search term or video URL.", 4, 250);
    }

    /**
     * Queue single song and set message accordingly in searchData.
     * @param player 
     * @param searchData 
     * @returns 
     */
    private handleSingle(player: MusicPlayer, searchData: SearchData): void
    {
        const song = searchData.songs[0];
        if (!song)
        {
            searchData.type = "error";
            searchData.message = "No result!";
            this.logger.logError("There should never be 0 results at this point in handleSingle()");
            return;
        }

        const queueSize = player.getQueueSize();
        const queueDuration = player.getQueueDuration();
        const playNow = player.enqueue(song);

        if (playNow)
            searchData.message = `Will begin playing:\n\`${song.name}\` [${hhmmss(song.duration)}]`;
        else
            searchData.message = `Qeueued:\n\`${song.name}\` [${hhmmss(song.duration)}]\nWill play in ${hhmmss(queueDuration)} (${queueSize} ahead in queue).`;
    }

    /**
     * Queue array of songs and set message accordingly in searchData.
     * @param player 
     * @param searchData 
     */
    private handleList(player: MusicPlayer, searchData: SearchData): void
    {
        const queueSize = player.getQueueSize();
        const queueDuration = player.getQueueDuration();

        const playNow = player.enqueue(searchData.songs);

        let duration = 0;
        for (const song of searchData.songs)
        {
            duration += song.duration;
        }

        if (playNow)
            searchData.message = `Added ${searchData.songs.length} [${hhmmss(duration)}] songs from a playlist:\n<${searchData.input}>`;
        else
            searchData.message = `Qeueued ${searchData.songs.length} [${hhmmss(duration)}] songs from a playlist, will start in ${hhmmss(queueDuration)} (${queueSize} ahead in queue).`;
    }

    /**
     * Search and handle queueing of song(s).
     * @param interaction 
     * @param searchOrURL 
     * @param player 
     * @returns 
     */
    private async handleSearch(interaction: ChatInputCommandInteraction, searchOrURL: string, player: MusicPlayer): Promise<SearchData>
    {
        const searchData = await processInput(searchOrURL, {
            displayName: interaction.user.displayName,
            userName: interaction.user.username
        });

        if (searchData.type == "single")
            this.handleSingle(player, searchData);
        else if (searchData.type == "list")
            this.handleList(player, searchData);

        return searchData;
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>)
    {
        const guildId = interaction.guildId;
        const voicechannel = this.getInteractionVoicechannel(interaction);
        const textchanel = interaction.channel;

        if (!voicechannel || !guildId || !textchanel)
        {
            await this.replyError(interaction, "You're not in a voice channel!");
            return;
        }

        if (!this.voiceManager.isBotFree(guildId)
            && !this.voiceManager.getBotForChannel(voicechannel))
        {
            await this.replyError(interaction, "I'm already in use in another channel!");
            return;
        }

        const searchOrURL = interaction.options.getString("search_or_url");
        if (!searchOrURL)
        {
            await this.replyError(interaction, "Missing search term!");
            return;
        }

        await interaction.deferReply();

        const player = await this.voiceManager.joinVoice(voicechannel, textchanel);
        if (!player)
        {
            await this.replyError(interaction, "Couldn't join voice channel!");
            return;
        }

        const searchData = await this.handleSearch(interaction, searchOrURL, player);

        if (searchData.type == "error")
        {
            this.replyError(interaction, searchData.message);
            return;
        }
        this.replySuccess(interaction, searchData.message);
    }
}
