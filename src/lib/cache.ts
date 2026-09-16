import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TranscriptResult } from "./types.js";

const CACHE_DIR = ".cache";

function cachePath(videoId: string): string {
  return join(CACHE_DIR, `${videoId}.json`);
}

export async function readCache(videoId: string): Promise<TranscriptResult | null> {
  try {
    const raw = await readFile(cachePath(videoId), "utf-8");
    return JSON.parse(raw) as TranscriptResult;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeCache(result: TranscriptResult): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath(result.videoId), JSON.stringify(result, null, 2), "utf-8");
}
