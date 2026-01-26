import { getConfig } from "../../configfile";
// import { readFile } from "fs/promises";
import { PlayCommand } from "./commands/PlayCommand";
import { SkipCommand } from "./commands/SkipCommand";
import { StopCommand } from "./commands/StopCommand";
import { QueueCommand } from "./commands/QueueCommand";
import { Discordbot } from "../../Discordbot/Discordbot";
import { PlayForChannelCommand } from "./commands/PlayForChannelCommand";
import { YtDlp } from 'ytdlp-nodejs';

export async function registerMusicPlayer(bot: Discordbot) {
    const cfg = getConfig();

    // let cookies = "";
    // if (cfg.youtubeCookie) {
    //     cookies = await readFile(cfg.youtubeCookie, "utf-8");
    // }

    const ytdlp = new YtDlp();

    bot.registerCommand(new PlayCommand(bot.voiceManager, ytdlp));
    bot.registerCommand(new SkipCommand(bot.voiceManager));
    bot.registerCommand(new StopCommand(bot.voiceManager));
    bot.registerCommand(new QueueCommand(bot.voiceManager));
    if (cfg.extraCommands.find((v) => v == "playex")) {
        bot.registerCommand(new PlayForChannelCommand(bot.voiceManager, ytdlp));
    }
}
