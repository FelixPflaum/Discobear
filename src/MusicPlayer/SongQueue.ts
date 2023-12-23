import { Song } from "./Song";

interface QueueItem
{
    content: Song,
    next?: QueueItem,
}

export class SongQueue
{
    private next: QueueItem | undefined;
    private last: QueueItem | undefined;
    private size: number;
    private duration: number;

    constructor()
    {
        this.size = 0;
        this.duration = 0;
    }

    /**
     * Add song to queue.
     * @param song 
     */
    add(song: Song)
    {
        const newItem: QueueItem = {
            content: song
        }

        if (this.last)
            this.last.next = newItem;

        this.last = newItem;

        if (!this.next)
            this.next = newItem;

        this.size++;
        this.duration += song.duration;
    }

    /**
     * Get next in queue. Removing the element from the queue.
     * @returns 
     */
    getNext()
    {
        const next = this.next;

        this.next = next?.next;
        if (this.last == next)
            this.last = undefined;

        if (next)
        {
            this.size--;
            this.duration -= next.content.duration;
            return next.content;
        }

        return;
    }

    /**
     * Get duration of all songs in the queue.
     * @returns 
     */
    getDuration()
    {
        return this.duration;
    }

    /**
     * Get count of songs in the queue.
     * @returns 
     */
    getSize()
    {
        return this.size;
    }

    /**
     * Get list of next songs up to count.
     * @param count 
     * @returns 
     */
    getSongList(count: number)
    {
        const list: Song[] = [];
        let next = this.next;
        while(count > 0 && next)
        {
            list.push(next.content);
            next = next.next;
            count--;
        }
        return list;
    }

    /**
     * Clear the queue.
     */
    clear()
    {
        this.next = undefined;
        this.last = undefined;
        this.size = 0;
        this.duration = 0;
    }
}
