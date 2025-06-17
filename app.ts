import { Innertube } from "youtubei.js";
import { Discordbot } from "./src/Discordbot/Discordbot";
import { Logger } from "./src/Logger";
import { PlayCommand } from "./src/commands/PlayCommand";
import { QueueCommand } from "./src/commands/QueueCommand";
import { SkipCommand } from "./src/commands/SkipCommand";
import { StopCommand } from "./src/commands/StopCommand";
import { getConfig } from "./src/configfile";
import { readFileSync } from "node:fs";

const log = new Logger("App");
let bot: Discordbot | undefined;

async function start() {
    log.log("Starting Discobear...");

    const cfg = getConfig();

    let cookies = "";
    if (cfg.youtubeCookie) {
        cookies = readFileSync(cfg.youtubeCookie, "utf-8");
    }

    const innerTube = await Innertube.create({
        //location: "DE",
        //client_type: ClientType.MUSIC,
        //user_agent: cfg.useragent,
        cookie: cookies,
        //generate_session_locally: true,
    });

    bot = new Discordbot(cfg.discordToken, innerTube);
    bot.registerCommand(new PlayCommand(bot.voiceManager));
    bot.registerCommand(new SkipCommand(bot.voiceManager));
    bot.registerCommand(new StopCommand(bot.voiceManager));
    bot.registerCommand(new QueueCommand(bot.voiceManager));
    await bot.connect();

    log.log("Discobear ready.");
}

async function stop() {
    log.log("Stopping...");
    if (bot) await bot.disconnect();

    setTimeout(() => {
        log.log("Discobear stopped.");
        // Can't be bothered to look into what's keeping it alive and why.
        // Bot is disconnected at this point so who cares.
        process.exit();
    }, 1000);
}

start();

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
