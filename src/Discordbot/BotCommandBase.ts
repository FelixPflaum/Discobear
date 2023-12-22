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

    protected addStringOption(name: string, description: string, required = false)
    {
        this.commandBuilder.addStringOption(opt => opt
            .setName(name.toLowerCase())
            .setDescription(description.trim())
            .setRequired(required));
    }

    /**
     * Get JSON payload for REST API.
     */
    getPayload()
    {
        return this.commandBuilder.toJSON();
    }

    abstract execute(interaction: ChatInputCommandInteraction): void | Promise<void>
}
