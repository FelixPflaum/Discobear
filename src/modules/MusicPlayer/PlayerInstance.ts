import { Guild, TextBasedChannel } from "discord.js";
import { SongQueue } from "./SongQueue";
import { Song } from "./Song";
import { buildNowPlayingEmbed } from "./playembed";
import { L } from "../../lang/language";
import Innertube from "youtubei.js";
import { Readable } from "node:stream";
import { VoiceBotInstance } from "../../Discordbot/VoiceBotInstance";

export class PlayerInstance extends VoiceBotInstance {
    static readonly moduleTypeId = "MusicPlayer";
    private readonly queue: SongQueue;
    private readonly innerTube: Innertube;
    private nowPlaying?: { song: Song; startedAt: number };
    private retryCounter = 0;
    private finished = false;

    constructor(guild: Guild, textchannel: TextBasedChannel, innerTube: Innertube) {
        super(PlayerInstance.moduleTypeId, guild, textchannel);
        this.queue = new SongQueue();
        this.innerTube = innerTube;

        this.addEventListener("playerError", (error) => {
            this.logger.logError("Player error!", error);

            if (this.finished) return;
            this.finished = true;

            this.retryCounter++;
            if (this.retryCounter > 2 || !this.nowPlaying) {
                this.logger.logError("Stream failed and couldn't restart, skipping!", this.nowPlaying?.song.url);
                this.playNext();
                return;
            }

            setTimeout(() => {
                if (this.nowPlaying) this.playSong(this.nowPlaying.song);
            }, 2500);
        });

        this.addEventListener("playerAutoPause", () => {
            this.logger.log("Player went into auto pause");
        });

        this.addEventListener("playerPlaying", async () => {
            this.finished = false;
        });

        this.addEventListener("playerIdle", () => {
            if (this.finished) return;
            this.finished = true;
            delete this.nowPlaying;
            this.playNext();
        });
    }

    static isInstance(i: VoiceBotInstance): i is PlayerInstance {
        return i.moduleTypeId == PlayerInstance.moduleTypeId;
    }

    /**
     * Play song.
     * @param song
     * @returns
     */
    private async playSong(song: Song) {
        let stream: Readable;

        try {
            const videoId = song.url.match(/v=([^^&]+)/)![1]!; // TODO: test
            const wstream = await this.innerTube.download(videoId, {
                type: "audio",
                quality: "best",
                format: "mp4",
                client: "IOS",
            });
            // @ts-expect-error
            stream = Readable.fromWeb(wstream);
        } catch (error) {
            this.sendText(L("Unable to create stream!"));
            this.destroy();
            this.logger.logError("Error on creating yt stream!", error);
            return;
        }

        this.playStream(stream);

        this.nowPlaying = {
            song: song,
            startedAt: Date.now() / 1000,
        };

        const next = this.queue.getSongList(1);
        this.sendText("", [buildNowPlayingEmbed(song, next[0])]);
    }

    /**
     * Play next song if queue isn't empty.
     */
    private playNext() {
        this.retryCounter = 0;
        const next = this.queue.getNext();
        if (next) this.playSong(next);
        else this.sendText(L("Nothing left to play, going back to sleep."));
    }

    /**
     * Enqueue song or array of songs.
     * @param songOrSongs
     * @returns True if song will play immedeately.
     */
    enqueue(songOrSongs: Song | Song[]): boolean {
        if (Array.isArray(songOrSongs)) {
            for (const song of songOrSongs) {
                this.queue.add(song);
            }
        } else {
            this.queue.add(songOrSongs);
        }

        if (!this.nowPlaying) {
            this.playNext();
            return true;
        }

        return false;
    }

    /**
     * Skip current song. Stops playback if queue is empty.
     * @returns True if something was skipped.
     */
    skip() {
        const wasPlaying = this.nowPlaying?.song;
        this.stopStream();
        return wasPlaying;
    }

    /**
     * Stop playback and empty queue.
     * @returns True is something was playing.
     */
    stop() {
        const wasPlaying = !!this.nowPlaying;
        this.queue.clear();
        this.skip();
        return wasPlaying;
    }

    /**
     * Get current queue size.
     * @returns
     */
    getQueueSize() {
        return this.queue.getSize();
    }

    /**
     * Get current queue duration. Including currently playing song.
     * @returns
     */
    getQueueDuration() {
        let currentRemaining = 0;
        if (this.nowPlaying) {
            const now = Date.now() / 1000;
            const currentEndsAt = this.nowPlaying.startedAt + this.nowPlaying.song.duration;
            currentRemaining = Math.max(0, currentEndsAt - now);
            currentRemaining = Math.round(currentRemaining);
        }
        return this.queue.getDuration() + currentRemaining;
    }

    /**
     * Get array of up to count next songs in queue.
     * @param count
     * @returns
     */
    getNextSongs(count: number) {
        return this.queue.getSongList(count);
    }
}
