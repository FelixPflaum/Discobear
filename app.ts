import { Discordbot } from "./src/Discordbot/Discordbot";
import { Logger } from "./src/Logger";
import { registerMusicPlayer } from "./src/modules/MusicPlayer/MusicPlayer";
import { getConfig } from "./src/configfile";

const log = new Logger("App");
let bot: Discordbot | undefined;

async function start() {
    log.log("Starting Discobear...");
    const cfg = getConfig();

    bot = new Discordbot(cfg.discordToken);

    await registerMusicPlayer(bot);

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
