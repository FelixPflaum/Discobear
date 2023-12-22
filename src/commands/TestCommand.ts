import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";

export class TestCommand extends BotCommandBase
{
    constructor()
    {
        super("test", "Just a test command.");
    }

    execute(interaction: ChatInputCommandInteraction<CacheType>): void
    {
        interaction.reply("test!");
    }
}
