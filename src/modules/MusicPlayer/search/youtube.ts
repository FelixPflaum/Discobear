import { YouTubeVideo, playlist_info, search, video_basic_info } from "play-dl";
import { Song } from "../Song";
import { getConfig } from "../../../configfile";
import { SearchData } from "./search";
import { L } from "../../../lang/language";

const cfg = getConfig();

/**
 * Get Song from video info.
 * @param info 
 * @param requester 
 * @returns 
 */
function songFromVideoInfo(info: YouTubeVideo, requester: Song["requester"])
{
    const bestThumbnail = info.thumbnails[info.thumbnails.length - 1];
    if (!info.title || !bestThumbnail) return;
    return new Song(info.title, info.url, info.durationInSec, bestThumbnail.url, requester);
}

/**
 * Get Song from youtube video URL.
 * @param searchData 
 * @returns 
 * @throws Propagates error if play-dl video_basic_info() throws an error.
 */
export async function handleURL(searchData: SearchData): Promise<void>
{
    const info = await video_basic_info(searchData.input);
    if (!info)
    {
        searchData.message = L("Could not get video info from URL!");
        return;
    }

    const song = songFromVideoInfo(info.video_details, searchData.requester);
    if (!song)
    {
        searchData.message = L("Could not get video info!");
        return;
    }

    if (song.duration > cfg.videoMaxDuration)
    {
        searchData.message = L("Video exceeds maximum allowed duration!");
        return;
    }

    searchData.type = "single";
    searchData.songs.push(song);
}

/**
 * Get Songs from youtube playlist URL.
 * @param searchData 
 * @returns 
 * @throws Propagates error if play-dl throws an error.
 */
export async function handlePlaylist(searchData: SearchData): Promise<void>
{
    const info = await playlist_info(searchData.input, { incomplete: true });

    if (info.total_videos > cfg.playListMaxSize)
    {
        searchData.message = L("Playlist exceeds maximum allowed size!");
        return;
    }

    const videos = await info.all_videos();
    let duration = 0;

    for (const video of videos)
    {
        const song = songFromVideoInfo(video, searchData.requester);
        if (!song) continue;
        duration += song.duration;
        searchData.songs.push(song);
    }

    if (searchData.songs.length == 0)
    {
        searchData.message = L("Playlist has no valid videos!");
        return;
    }

    if (duration > cfg.playListMaxDuration)
    {
        searchData.message = L("Playlist exceeds maximum allowed duration!");
        return;
    }

    searchData.type = "list";
}

/**
 * Search on youtube.
 * @param searchData 
 * @returns 
 * @throws Propagates error if play-dl search() throws an error.
 */
export async function handleSearch(searchData: SearchData): Promise<void>
{
    const results = await search(searchData.input, {
        limit: 1,
        source: { youtube: "video" }
    });

    const video = results && results[0];
    if (!video)
    {
        searchData.message = L("No results for: ") + searchData.input;
        return;
    }

    const song = songFromVideoInfo(video, searchData.requester);
    if (!song)
    {
        searchData.message = L("Could not get video info!");
        return;
    }

    searchData.message = L("Searched for: `{searchterm}`", { searchterm: searchData.input });
    searchData.type = "single";
    searchData.songs.push(song);
}
