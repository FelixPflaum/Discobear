import { YouTubeVideo, playlist_info, search, validate, video_basic_info } from "play-dl";
import { Logger } from "./Logger";
import { Song } from "./Song";
import { getConfig } from "./configfile";

const cfg = getConfig();
const logger = new Logger("Search");

function songFromVideoInfo(info: YouTubeVideo)
{
    const bestThumbnail = info.thumbnails[info.thumbnails.length - 1];
    if (!info.title || !bestThumbnail) return;
    return new Song(info.title, info.url, info.durationInSec, bestThumbnail.url);
}

/**
 * Get Song from youtube video URL.
 * @param url 
 * @returns 
 * @throws {string} Error message meant to be shown to the user.
 */
async function getSongFromYoutubeURL(url: string)
{
    const info = await video_basic_info(url);
    const song = songFromVideoInfo(info.video_details);
    if (!song) throw "Could not get video info!";
    if (song.duration > cfg.videoMaxDuration) throw "Video exceeds maximum allowed duration!";
    return song;
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
        const song = songFromVideoInfo(video);
        if (!song) continue;
        duration += song.duration;
        songs.push(song);
    }

    if (duration > cfg.playListMaxDuration) throw "Playlist exceeds maximum allowed duration!";

    return songs;
}

async function searchYoutube(term: string)
{
    const results = await search(term, { limit: 1, source: { youtube: "video" } });
    const video = results && results[0];
    if (!video) return;
    const song = songFromVideoInfo(video);
    if (!song) throw "Could not get video info!";
    return song;
}

/**
 * 
 * @param input 
 * @throws {string} Error message meant to be shown to the user.
 * @returns Song for single search or Song[] array for playlists. Undefined or empty array if 0 (valid) results.
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
            return searchYoutube(input);
        default:
            throw "Unhandled input type!";
    }
}
