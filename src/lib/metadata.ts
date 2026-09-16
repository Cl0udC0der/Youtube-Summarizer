import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Chapter } from "./types.js";

const execFileAsync = promisify(execFile);

export interface Metadata {
  title: string;
  channel: string;
  durationSeconds: number;
  chapters: Chapter[];
}

const EMPTY_METADATA: Metadata = {
  title: "",
  channel: "",
  durationSeconds: 0,
  chapters: [],
};

/**
 * Uses yt-dlp for metadata (title/channel/duration/chapters) since it's a
 * single reliable source for all of them, chapters especially. Falls back to
 * empty metadata rather than failing the whole pipeline, so transcript tiers
 * that don't need yt-dlp (e.g. public captions) still work without it installed.
 */
export async function fetchMetadata(videoId: string): Promise<Metadata> {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--dump-json",
      "--skip-download",
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    const data = JSON.parse(stdout);
    const chapters: Chapter[] = Array.isArray(data.chapters)
      ? data.chapters.map((c: { title: string; start_time: number }) => ({
          title: c.title,
          startSeconds: c.start_time,
        }))
      : [];

    return {
      title: data.title ?? "",
      channel: data.channel ?? data.uploader ?? "",
      durationSeconds: data.duration ?? 0,
      chapters,
    };
  } catch {
    return EMPTY_METADATA;
  }
}
