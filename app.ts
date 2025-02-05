// import { setToken } from "play-dl";
import { Discordbot } from "./src/Discordbot/Discordbot";
import { Logger } from "./src/Logger";
import { PlayCommand } from "./src/commands/PlayCommand";
import { QueueCommand } from "./src/commands/QueueCommand";
import { SkipCommand } from "./src/commands/SkipCommand";
import { StopCommand } from "./src/commands/StopCommand";
import { getConfig } from "./src/configfile";

const log = new Logger("App");
let bot: Discordbot | undefined;

// function applyPlayDlSettings(ytcookie: string, agent: string) {
//     const options: Parameters<typeof setToken>[0] = {};

//     if (ytcookie) {
//         options.youtube = {
//             cookie: ytcookie,
//         };
//     }

//     if (agent) {
//         options.useragent = [agent];
//     }

//     setToken(options);
// }

async function start()
{
    log.log("Starting Discobear...");

    const cfg = getConfig();
    // applyPlayDlSettings(cfg.youtubeCookie, cfg.useragent)
    bot = new Discordbot(cfg.discordToken);
    bot.registerCommand(new PlayCommand(bot.voiceManager));
    bot.registerCommand(new SkipCommand(bot.voiceManager));
    bot.registerCommand(new StopCommand(bot.voiceManager));
    bot.registerCommand(new QueueCommand(bot.voiceManager));
    await bot.connect();

    log.log("Discobear ready.");
}

async function stop()
{
    log.log("Stopping...");
    if (bot) await bot.disconnect();

    setTimeout(() =>
    {
        log.log("Discobear stopped.");
        // Can't be bothered to look into what's keeping it alive and why.
        // Bot is disconnected at this point so who cares.
        process.exit();
    }, 1000);
}

start();

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
