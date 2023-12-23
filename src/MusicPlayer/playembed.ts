import { EmbedBuilder } from "discord.js";
import { Song } from "./Song";
import { hhmmss } from "../helper";

export function buildNowPlayingEmbed(song: Song)
{
    return new EmbedBuilder()
        .setTitle("💿 Now Playing")
        .setDescription(song.name)
        .setColor("#41a92f")
        .setFields(
            { name: "Duration", value: hhmmss(song.duration), inline: true },
            { name: "Requested by", value: song.requester.displayName, inline: true }
        )
        .setThumbnail(song.thumbnailUrl);
}
