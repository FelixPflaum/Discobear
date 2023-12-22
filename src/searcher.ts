import { playlist_info, validate, video_basic_info } from "play-dl";
import { Logger } from "./Logger";
import { Song } from "./Song";
import { getConfig } from "./configfile";

const cfg = getConfig();
const logger = new Logger("Search");

/**
 * Get Song from youtube video URL.
 * @param url 
 * @returns 
 * @throws {string} Error message meant to be shown to the user.
 */
async function getSongFromYoutubeURL(url: string)
{
    const info = await video_basic_info(url);
    const details = info.video_details;
    const bestThumbnail = details.thumbnails[details.thumbnails.length - 1];

    if (!details.title || !bestThumbnail) throw "Could not get video details!";
    if (details.durationInSec > cfg.videoMaxDuration) throw "Video exceeds maximum allowed duration!";

    return new Song(details.title, url, details.durationInSec, bestThumbnail.url);
}

/**
 * Get Songs from youtube playlist URL.
 * @param url 
 * @returns 
 * @throws {string} Error message meant to be shown to the user.
 */
async function getSongsFromYoutubePlaylist(url: string)
{
    const info = await playlist_info(url, { incomplete: true });
    const songs: Song[] = [];

    if (info.total_videos > cfg.playListMaxSize) throw "Playlist exceeds maximum allowed size!";

    const videos = await info.all_videos();
    let duration = 0;

    for (const video of videos)
    {
        duration += video.durationInSec;
        const bestThumbnail = video.thumbnails[video.thumbnails.length - 1];
        if (!video.title || !bestThumbnail) continue;
        songs.push(new Song(video.title, url, video.durationInSec, bestThumbnail.url))
    }

    if (duration > cfg.playListMaxDuration) throw "Playlist exceeds maximum allowed duration!";

    return songs;
}

/**
 * 
 * @param input 
 * @throws {string} Error message meant to be shown to the user.
 */
export async function processInput(input: string)
{
    input = input.trim();
    let inputType: string | false;

    try
    {
        inputType = await validate(input);
    }
    catch (error) 
    {
        logger.logError("Failed to validate input!", error);
        throw "Could not validate input!";
    }

    switch (inputType)
    {
        case "so_playlist":
        case "so_track":
        case "dz_album":
        case "dz_track":
        case "dz_playlist":
        case "sp_track":
        case "sp_album":
        case "sp_playlist":
            throw "Unsupported service!";
        case "yt_playlist":
            return getSongsFromYoutubePlaylist(input);
        case "yt_video":
            return getSongFromYoutubeURL(input);
        case "search":
            throw "Search term support NYI!";
        default:
            throw "Unhandled input type!";
    }
}
