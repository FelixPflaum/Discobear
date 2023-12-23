export class Song
{
    readonly url: string;
    readonly name: string;
    readonly duration: number;
    readonly thumbnailUrl: string;
    readonly requester: {
        readonly displayName: string,
        readonly userName: string
    };

    constructor(name: string, url: string, duration: number, thumbnailUrl: string,
        requester: { displayName: string, userName: string })
    {
        this.name = name;
        this.url = url;
        this.duration = duration;
        this.thumbnailUrl = thumbnailUrl;
        this.requester = requester;
    }
}
