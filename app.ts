import { Discordbot } from "./src/Discordbot/Discordbot";
import { Logger } from "./src/Logger";
import { PlayCommand } from "./src/commands/PlayCommand";
import { QueueCommand } from "./src/commands/QueueCommand";
import { SkipCommand } from "./src/commands/SkipCommand";
import { StopCommand } from "./src/commands/StopCommand";
import { getConfig } from "./src/configfile";

const log = new Logger("App");
let bot: Discordbot | undefined;

async function start()
{
    log.log("----------------------------------");
    log.log("----------------------------------");
    log.log("Starting Discobear...");

    const cfg = getConfig();
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
    log.log("Discobear stopped.");
}

start();

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
