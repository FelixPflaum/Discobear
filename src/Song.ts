export class Song
{
    readonly url: string;
    readonly name: string;
    readonly duration: number;
    readonly thumbnailUrl: string;

    constructor(name: string, url: string, duration: number, thumbnailUrl: string)
    {
        this.name = name;
        this.url = url;
        this.duration = duration;
        this.thumbnailUrl = thumbnailUrl;
    }
}
