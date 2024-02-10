import { validate } from "play-dl";
import { Logger } from "../Logger";
import { Song } from "../MusicPlayer/Song";
import * as yt from "./youtube";
import { L } from "../lang/language";

type PDLValidationResults = Awaited<ReturnType<typeof validate>>;

export interface SearchData
{
    /** If this is error then message will be the error message. */
    type: "error" | "single" | "list",
    inputType: PDLValidationResults,
    input: string,
    requester: Song["requester"],
    /** The (error) message to be shown to the client. */
    message?: string,
    songs: Song[]
}

const logger = new Logger("Search");

/**
 * Process search input.
 * @param input 
 * @param requester
 * @returns 
 */
export async function processInput(input: string, requester: SearchData["requester"]): Promise<Readonly<SearchData>>
{
    input = input.trim();

    const searchData: SearchData = {
        input: input,
        inputType: false,
        requester: requester,
        type: "error",
        songs: []
    }

    try
    {
        searchData.inputType = await validate(input);
    }
    catch (error) 
    {
        logger.logError("Failed to validate input!", error);
        searchData.message = L("Could not validate input!");
        return searchData;
    }

    try
    {
        switch (searchData.inputType)
        {
            case "so_playlist":
            case "so_track":
            case "dz_album":
            case "dz_track":
            case "dz_playlist":
            case "sp_track":
            case "sp_album":
            case "sp_playlist":
                searchData.message = L("Unsupported service!");
                break;
            case "yt_playlist":
                await yt.handlePlaylist(searchData);
                break;
            case "yt_video":
                await yt.handleURL(searchData);
                break;
            case "search":
                await yt.handleSearch(searchData);
                break;
            case false:
            default:
                searchData.message = L("Invalid input!");
        }
    }
    catch (error)
    {
        logger.logError("Error while handling search!", error);
        searchData.message = L("Error while getting data!");
    }

    return searchData;
}
