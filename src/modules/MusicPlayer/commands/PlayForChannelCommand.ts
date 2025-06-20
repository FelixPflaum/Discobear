import { type ChatInputCommandInteraction, type CacheType, VoiceChannel, ChannelType, MessageFlags } from "discord.js";
import { BotCommandBase } from "../../../Discordbot/BotCommandBase";
import type { SearchData } from "../search/search";
import { processInput } from "../search/search";
import type { VoiceManager } from "../../../Discordbot/VoiceManager";
import { PlayerInstance } from "../PlayerInstance";
import { hhmmss } from "../../../helper";
import { L } from "../../../lang/language";
import Innertube from "youtubei.js/agnostic";

interface EnqueueResult {
    isError: boolean;
    message: string;
}

export class PlayForChannelCommand extends BotCommandBase {
    private readonly voiceManager: VoiceManager;
    private readonly innerTube: Innertube;

    constructor(voiceManager: VoiceManager, innerTube: Innertube) {
        super("playex", L("Play or queue music."));
        this.innerTube = innerTube;
        this.voiceManager = voiceManager;
        this.addStringOption("search_or_url", L("Search term or video URL."), 4, 250);
        this.commandBuilder.addChannelOption((opt) =>
            opt
                .setName("channel")
                .setDescription(L("Channel to join."))
                .setRequired(true)
                .addChannelTypes([ChannelType.GuildVoice])
        );
        this.setRequiresPermission();
    }

    /**
     * Queue single song and set message accordingly in searchData.
     * @param player
     * @param searchData
     * @returns
     */
    private handleSingle(player: PlayerInstance, searchData: Readonly<SearchData>): EnqueueResult {
        const song = searchData.songs[0];
        if (!song) {
            this.logger.logError("There should never be 0 results at this point in handleSingle()");
            return { isError: true, message: L("No result!") };
        }

        const res: EnqueueResult = { isError: false, message: "" };
        const queueSize = player.getQueueSize();
        const queueDuration = player.getQueueDuration();
        const playNow = player.enqueue(song);

        if (playNow)
            res.message = L("Will begin playing:\n`{name}` [{dur}]", { name: song.name, dur: hhmmss(song.duration) });
        else
            res.message = L("Qeueued:\n`{name}` [{dur}]\nWill play in {playin} ({qsize} ahead in queue).", {
                name: song.name,
                dur: hhmmss(song.duration),
                playin: hhmmss(queueDuration),
                qsize: queueSize,
            });

        if (searchData.message) res.message = searchData.message + "\n" + res.message;
        return res;
    }

    /**
     * Queue array of songs and set message accordingly in searchData.
     * @param player
     * @param searchData
     */
    private handleList(player: PlayerInstance, searchData: Readonly<SearchData>): EnqueueResult {
        const queueSize = player.getQueueSize();
        const queueDuration = player.getQueueDuration();
        const res: EnqueueResult = { isError: false, message: "" };
        const playNow = player.enqueue(searchData.songs);

        let duration = 0;
        for (const song of searchData.songs) {
            duration += song.duration;
        }

        if (playNow)
            res.message = L("Added {count} [{dur}] songs from a playlist:\n<{url}>", {
                count: searchData.songs.length,
                dur: hhmmss(duration),
                url: searchData.input,
            });
        else
            res.message = L(
                "Qeueued {count} [{dur}] songs from a playlist:\n<{url}>\nWill start in {playin} ({qsize} ahead in queue).",
                {
                    count: searchData.songs.length,
                    dur: hhmmss(duration),
                    url: searchData.input,
                    playin: hhmmss(queueDuration),
                    qsize: queueSize,
                }
            );

        if (searchData.message) res.message = searchData.message + "\n" + res.message;
        return res;
    }

    /**
     * Search and handle queueing of song(s).
     * @param interaction
     * @param searchOrURL
     * @param player
     * @returns
     */
    private async handleSearch(
        interaction: ChatInputCommandInteraction,
        displayName: string,
        searchOrURL: string,
        player: PlayerInstance
    ): Promise<Readonly<EnqueueResult>> {
        const searchData = await processInput(searchOrURL, {
            displayName: displayName,
            userName: interaction.user.username,
        });

        if (searchData.type == "single") return this.handleSingle(player, searchData);
        else if (searchData.type == "list") return this.handleList(player, searchData);

        return { isError: true, message: searchData.message ?? "No error message." };
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const guildId = interaction.guildId;
        const textchanel = interaction.channel;

        if (!guildId || !textchanel) {
            await this.replyError(interaction, L("You're not in a voice channel!"), true);
            return;
        }

        const voicechannel = interaction.options.getChannel("channel") as VoiceChannel;
        if (!voicechannel) {
            await this.replyError(interaction, L("Invalid channel!"), true);
            return;
        }

        if (!this.voiceManager.isBotFree(guildId) && !this.voiceManager.getBotForChannel(voicechannel)) {
            await this.replyError(interaction, L("I'm already in use in another channel!"), true);
            return;
        }

        const searchOrURL = interaction.options.getString("search_or_url");
        if (!searchOrURL) {
            await this.replyError(interaction, L("Missing search term!"), true);
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const player = await this.voiceManager.joinVoice(voicechannel, () => {
            return new PlayerInstance(voicechannel.guild, textchanel, this.innerTube);
        });

        if (!player || !PlayerInstance.isInstance(player)) {
            await this.replyError(interaction, L("Couldn't join voice channel!"), true);
            return;
        }

        const result = await this.handleSearch(interaction, "-", searchOrURL, player);

        if (result.isError) {
            this.replyError(interaction, result.message, true);
            return;
        }
        this.replySuccess(interaction, result.message, true);
    }
}
