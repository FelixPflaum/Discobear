import { EmbedBuilder } from "discord.js";
import { Song } from "./Song";
import { hhmmss } from "../../helper";
import { L } from "../../lang/language";

export function buildNowPlayingEmbed(song: Song, next?: Song)
{
    const embed = new EmbedBuilder()
        .setTitle(L("💿 Now Playing"))
        .setDescription(song.name)
        .setColor("#41a92f")
        .setFields(
            { name: L("Duration"), value: hhmmss(song.duration), inline: true },
            { name: L("Requested by"), value: song.requester.displayName, inline: true }
        )
        .setThumbnail(song.thumbnailUrl);

    if (next)
        embed.addFields({ name: L("Playing next"), value: next.name });

    return embed;
}
