/**
 * Formats seconds into [HH:]MM:SS
 * @param timeInSec 
 */
export function hhmmss(timeInSec: number): string
{
    const hours = Math.floor(timeInSec / 3600);
    const minutes = Math.floor((timeInSec % 3600) / 60);
    const seconds = timeInSec % 60;
    let timeStr = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
    if (hours) timeStr = minutes.toString().padStart(2, "0") + ":" + timeStr;
    return timeStr;
}
