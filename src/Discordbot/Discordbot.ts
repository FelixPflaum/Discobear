import { Client, GatewayIntentBits, Guild, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from "discord.js";
import { Logger } from "../Logger";
import { BotCommandBase } from "./BotCommandBase";
import { VoiceManager } from "./VoiceManager";

export class Discordbot {
    private readonly token: string;
    private readonly client: Client;
    private readonly logger: Logger;
    private readonly commands: Map<string, BotCommandBase>;
    readonly voiceManager: VoiceManager;

    constructor(token: string) {
        this.token = token;
        this.logger = new Logger("Discordbot");
        this.commands = new Map<string, BotCommandBase>();

        this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

        this.voiceManager = new VoiceManager(this.client);

        this.client.on("clientReady", () => {
            this.logger.log("Logged in and ready.");

            if (process.argv.includes("listguilds")) {
                const guilds = [...this.client.guilds.cache.values()];
                this.logger.log(`Joined ${guilds.length} guild(s):`);
                for (const guild of guilds) {
                    this.logger.log(`- ${guild.name} (${guild.id})`);
                }
                process.exit(0);
            }

            const leaveIdx = process.argv.indexOf("leaveguild");
            if (leaveIdx !== -1) {
                const guildId = process.argv[leaveIdx + 1];
                const guild = guildId ? this.client.guilds.cache.get(guildId) : undefined;
                if (!guild) {
                    this.logger.logError(
                        guildId
                            ? `Guild ${guildId} not found in the guild cache!`
                            : "Missing guild Id! Usage: node <script> leaveguild <guildId>"
                    );
                    process.exit(1);
                }
                this.logger.log(`Leaving guild ${guild.name} (${guild.id})...`);
                guild.leave().then(() => {
                    this.logger.log(`Left guild ${guild.name} (${guild.id}).`);
                    process.exit(0);
                });
                return;
            }

            for (const guild of this.client.guilds.cache.values()) {
                this.refreshCommandsForGuild(guild);
            }
        });

        this.client.on("guildCreate", (guild) => {
            this.refreshCommandsForGuild(guild);
        });

        this.client.on("interactionCreate", async (interaction) => {
            if (!interaction || !interaction.isChatInputCommand()) return;
            const cmdName = interaction.commandName;
            const command = this.commands.get(cmdName);
            if (command) command.execute(interaction, this);
        });
    }

    /**
     * Register a command.
     * @param command
     */
    registerCommand(command: BotCommandBase): void {
        if (this.client.isReady()) throw new Error("Bot is already logged in! Register commands before calling connect()!");
        if (this.commands.has(command.command)) throw new Error("Command with that name already registered!");
        this.commands.set(command.command, command);
    }

    /**
     * Refresh commands for a guild.
     * @param guild
     */
    private async refreshCommandsForGuild(guild: Guild) {
        this.logger.log(`Refreshing application commands for guild ${guild.name} (${guild.id})...`);

        const rest = new REST().setToken(this.token);
        const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

        for (const cmd of this.commands.values()) {
            commands.push(cmd.getPayload());
        }

        try {
            const clientId = this.client.user?.id;
            if (!clientId) throw new Error("Bot has no user?! Can't get client Id.");
            const data = await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commands });
            this.logger.log(
                `Successfully refreshed ${Array.isArray(data) ? data.length : "??"} application commands for guild ${
                    guild.name
                } (${guild.id}).`
            );
        } catch (error) {
            this.logger.logError(`Failed to refresh commands in guild ${guild.name} (${guild.id})!`, error);
            console.error(error);
        }
    }

    /**
     * Connect the bot client.
     */
    async connect() {
        if (this.client.isReady()) Promise.resolve();
        this.logger.log("Logging in...");
        await this.client.login(this.token);
    }

    /**
     * Disconnect the bot client.
     * @returns
     */
    disconnect() {
        this.voiceManager.destroy();
        return this.client.destroy();
    }
}
