import { readFileSync, existsSync, writeFileSync } from "fs";
import { Logger } from "./Logger";

interface IConfigFile
{
    discordToken: string,
    videoMaxDuration: number,
    playListMaxSize: number,
    playListMaxDuration: number,
}

const data: IConfigFile = {
    discordToken: "",
    videoMaxDuration: 3600 * 5,
    playListMaxSize: 50,
    playListMaxDuration: 3600 * 5
}

const fileName = "config.json";
const logger = new Logger("Configfile");
let loaded = false;

/**
 * Write config file.
 */
function safeConfigFile()
{
    writeFileSync(fileName, JSON.stringify(data, null, 4));
}

/**
 * Read config file. Ends process if file can't be read or parsed for whatever reason.
 * @returns 
 */
function readConfigFile()
{
    try
    {
        const parsed = JSON.parse(readFileSync(fileName, "utf-8"));
        if (typeof parsed !== "object")
        {
            logger.logError("Config file is malformed!");
            process.exit(1);
        }
        return <{ [index: string]: any }>parsed;
    }
    catch (error)
    {
        logger.logError("Error while reading config file!", error);
        process.exit(1);
    }
}

/**
 * Update settings data with file data.
 * @param fileData 
 * @returns List of settings that were missing from file data.
 */
function updateSettings(fileData: { [index: string]: any })
{
    const newSettings: string[] = [];

    let setting: keyof IConfigFile;
    for (setting in data)
    {
        const fromFile = fileData[setting];
        if (fromFile && typeof fromFile === typeof data[setting])
        {
            // @ts-ignore
            data[setting] = fromFile;
        }
        else
        {
            newSettings.push(setting);
        }
    }

    return newSettings;
}

/**
 * Attempt to load config data from file. Process will end if data is missing or can't be read.
 */
function loadConfigData()
{
    logger.log("Trying to load file (" + fileName + ")...");

    if (!existsSync(fileName))
    {
        safeConfigFile();
        logger.log("New config file created! Edit settings and start again.");
        process.exit(0);
    }

    const newSettings = updateSettings(readConfigFile());

    if (newSettings.length > 0)
    {
        safeConfigFile();
        logger.log(`Following ${newSettings.length} new settings were added to config file (" + FILENAME + "):`);
        for (const setting of newSettings)
        {
            logger.log(setting);
        }
        logger.log("Adjust these settings if needed and start again.");
        process.exit(0);
    }

    loaded = true;
    logger.log("Config data loaded.");
}

/**
 * Get settings from config file.
 * @returns Config file data.
 */
export function getConfig()
{
    if (!loaded) loadConfigData();
    return <Readonly<IConfigFile>>data;
}
