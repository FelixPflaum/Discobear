import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionsBitField } from "discord.js";

export abstract class BotCommandBase
{
    readonly command: string;
    protected readonly commandBuilder: SlashCommandBuilder;

    constructor(command: string, description: string)
    {
        command = command.toLowerCase();
        this.command = command;

        this.commandBuilder = new SlashCommandBuilder()
            .setName(command)
            .setDescription(description)
            .setDMPermission(false);
    }

    /**
     * Set command to require the MuteMembers permission.
     */
    protected setRequiresPermission()
    {
        const permissions = new PermissionsBitField();
        permissions.add("MuteMembers");
        this.commandBuilder.setDefaultMemberPermissions(permissions.bitfield);
    }

    /**
     * Add string option.
     * @param name Only allows lowercase characters and underscores.
     * @param description 
     * @param minLen 
     * @param maxLen 
     * @throws Error if name contains invalid characters.
     */
    protected addStringOption(name: string, description: string, minLen = 0, maxLen = 9999)
    {
        if (name.match(/[^a-z_]/)) throw new Error("String option name contains invalid characters!");

        this.commandBuilder.addStringOption(opt => opt
            .setName(name)
            .setDescription(description.trim())
            .setRequired(minLen != 0)
            .setMinLength(minLen)
            .setMaxLength(maxLen));
    }

    /**
     * Get JSON payload for REST API.
     */
    getPayload()
    {
        return this.commandBuilder.toJSON();
    }

    protected replyError(interaction: ChatInputCommandInteraction, msg: string)
    {
        msg = "❌ " + msg;
        if (interaction.deferred) return interaction.editReply(msg);
        return interaction.reply(msg);
    }

    protected replySuccess(interaction: ChatInputCommandInteraction, msg: string)
    {
        msg = "✅ " + msg;
        if (interaction.deferred) return interaction.editReply(msg);
        return interaction.reply(msg);
    }

    abstract execute(interaction: ChatInputCommandInteraction): void | Promise<void>
}
