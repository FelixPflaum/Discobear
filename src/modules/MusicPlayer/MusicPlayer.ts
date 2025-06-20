import { getConfig } from "../../configfile";
import { Innertube } from "youtubei.js";
import { readFile } from "fs/promises";
import { PlayCommand } from "./commands/PlayCommand";
import { SkipCommand } from "./commands/SkipCommand";
import { StopCommand } from "./commands/StopCommand";
import { QueueCommand } from "./commands/QueueCommand";
import { Discordbot } from "../../Discordbot/Discordbot";
import { PlayForChannelCommand } from "./commands/PlayForChannelCommand";

export async function registerMusicPlayer(bot: Discordbot) {
    const cfg = getConfig();

    let cookies = "";
    if (cfg.youtubeCookie) {
        cookies = await readFile(cfg.youtubeCookie, "utf-8");
    }

    const innerTube = await Innertube.create({
        //location: "DE",
        //client_type: ClientType.MUSIC,
        //user_agent: cfg.useragent,
        cookie: cookies,
        //generate_session_locally: true,
    });

    bot.registerCommand(new PlayCommand(bot.voiceManager, innerTube));
    bot.registerCommand(new SkipCommand(bot.voiceManager));
    bot.registerCommand(new StopCommand(bot.voiceManager));
    bot.registerCommand(new QueueCommand(bot.voiceManager));
    if (cfg.extraCommands.find((v) => v == "playex")) {
        bot.registerCommand(new PlayForChannelCommand(bot.voiceManager, innerTube));
    }
}
