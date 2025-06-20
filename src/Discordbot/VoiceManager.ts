import { Client, VoiceBasedChannel } from "discord.js";
import { Logger } from "../Logger";
import { VoiceBotInstance } from "./VoiceBotInstance";

export class VoiceManager {
    private readonly activeVoiceInstances: Map<string, VoiceBotInstance>;
    private readonly logger: Logger;

    constructor(client: Client) {
        this.logger = new Logger("VoiceManager");
        this.activeVoiceInstances = new Map<string, VoiceBotInstance>();

        // Manually track voice channel activity.
        // VoiceConnection does NOT provide its current channel, so this seems to be needed.
        client.on("voiceStateUpdate", (oldState, newState) => {
            const guildId = oldState.guild.id;
            const instance = this.activeVoiceInstances.get(guildId);

            if (!client.user || !instance) return;

            // State change is for a connection from the bot.
            if (oldState.id == client.user.id) {
                if (newState.channel) instance.updateChannel(newState.channel);
                return;
            }

            // Handle other users leaving or joining a channel with the bot in it.
            if (oldState.channel && instance.isInChannel(oldState.channel)) {
                instance.updateChannel(oldState.channel);
            } else if (newState.channel && instance.isInChannel(newState.channel)) {
                instance.updateChannel(newState.channel);
            }
        });
    }

    /**
     * Check if bot is not in use in guild.
     * @param guildId
     * @returns
     */
    isBotFree(guildId: string) {
        return !this.activeVoiceInstances.has(guildId);
    }

    /**
     * Return VoiceInstance if bot is currently active in this channel.
     * @param voicechannel
     * @returns VoiceBotInstance if currently active in channel.
     */
    getBotForChannel(voicechannel: VoiceBasedChannel): VoiceBotInstance | undefined {
        const active = this.activeVoiceInstances.get(voicechannel.guildId);
        if (!active || !active.isInChannel(voicechannel)) return;
        return active;
    }

    /**
     * Return current VoiceInstance for guild if one is active.
     * @param guildId
     * @returns VoiceBotInstance if currently active.
     */
    getBotForGuild(guildId: string): VoiceBotInstance | undefined {
        const active = this.activeVoiceInstances.get(guildId);
        if (!active) return;
        return active;
    }

    /**
     * Create player for voice channel and attempt to connect.
     * @param voicechannel
     * @param textChannel
     * @param customFactory VoiceBotInstance will be created using this function.
     * @returns VoiceBotInstance if connection was successful or an instance already existed for this channel.
     */
    async joinVoice(
        voicechannel: VoiceBasedChannel,
        instanceFactory: () => VoiceBotInstance
    ): Promise<VoiceBotInstance | undefined> {
        const guildId = voicechannel.guild.id;

        if (!this.isBotFree(guildId)) {
            return this.getBotForChannel(voicechannel);
        }

        this.logger.log(`Adding VoiceInstance for guild ${voicechannel.guild.name} (${guildId}).`);

        const newInstance = instanceFactory();
        this.activeVoiceInstances.set(guildId, newInstance);

        newInstance.addEventListener("destroy", () => {
            this.logger.log(`Removing VoiceInstance for guild ${voicechannel.guild.name} (${guildId}).`);
            this.activeVoiceInstances.delete(newInstance.guildId);
        });

        if (!(await newInstance.connectToVoice(voicechannel))) {
            newInstance.destroy();
            return;
        }
        return newInstance;
    }

    /**
     * Destroy all active voice instances.
     */
    destroy() {
        for (const instance of this.activeVoiceInstances.values()) {
            instance.destroy();
        }
    }
}
