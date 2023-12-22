import { readFileSync, existsSync, writeFileSync } from "fs";
import { Logger } from "./Logger";

interface IConfigFile
{
    discordToken: string,
}

const DEFAULTS: IConfigFile = {
    discordToken: "",
}

const FILENAME = "config.json";

let data: IConfigFile | undefined;

function safeConfigFile()
{
    if (!data) throw new Error("Config data doesn't exist!");
    writeFileSync(FILENAME, JSON.stringify(data, null, 4));
}

function loadConfigFile()
{
    const logger = new Logger("Configfile");

    if (!existsSync(FILENAME))
    {
        data = DEFAULTS;
        safeConfigFile();
        logger.log("Config file (" + FILENAME + ") created! Edit settings and start again.");
        process.exit(0);
    }

    try
    {
        data = JSON.parse(readFileSync(FILENAME, "utf-8"));
    }
    catch (error)
    {
        logger.logError("Error while reading config file!", error);
        process.exit(1);
    }

    let settingsWereMissing = false;

    for (let setting in DEFAULTS)
    {
        if (!data![<keyof IConfigFile>setting])
        {
            data![<keyof IConfigFile>setting] = DEFAULTS[<keyof IConfigFile>setting];
            settingsWereMissing = true;
        }
    }

    if (settingsWereMissing)
    {
        safeConfigFile();
        logger.log("One or more new settings were added to config file (" + FILENAME + "). Edit settings and start again.");
        process.exit(0);
    }
}

/**
 * Get settings from config file.
 * @returns Config file data.
 */
export function getConfig()
{
    if (!data) loadConfigFile();
    return <Readonly<IConfigFile>>data;
}
