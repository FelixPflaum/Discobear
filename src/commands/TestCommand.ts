import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { BotCommandBase } from "../Discordbot/BotCommandBase";
import { processInput } from "../searcher";

export class TestCommand extends BotCommandBase
{
    constructor()
    {
        super("test", "Just a test command.");
        this.addStringOption("test", "a test param", true);
    }

    private getOption(interaction: ChatInputCommandInteraction)
    {
        const opt = interaction.options.getString("test");
        return opt || "";
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>)
    {
        const opt = this.getOption(interaction);
        if (opt)
        {
            await interaction.deferReply();
            try
            {
                const songs = await processInput(opt);
                if (Array.isArray(songs))
                {
                    await interaction.editReply("test! songs: " + songs.length);
                    return;
                }
                await interaction.editReply("test! song: " + songs.name);
                return;
            }
            catch (error)
            {
                if (typeof error === "string") await interaction.editReply("test! " + error);
                return;
            }
        }
        interaction.reply("test! no opt: " + opt);
    }
}
