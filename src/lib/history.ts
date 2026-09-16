import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TranscriptResult, TranscriptSource } from "./types.js";

const HISTORY_DIR = "history";
const DATABASE_PATH = join(HISTORY_DIR, "database.json");

const EXTRACT_METHOD_LABEL: Record<TranscriptSource, string> = {
  "owned-api": "oauth",
  extractor: "yt-dlp",
  "public-captions": "captions",
  "audio-transcription": "whisper",
};

export interface HistoryEntry extends TranscriptResult {
  platform: "Youtube";
  extractMethod: string;
  iteration: number;
  filename: string;
}

async function readDatabase(): Promise<HistoryEntry[]> {
  try {
    const raw = await readFile(DATABASE_PATH, "utf-8");
    return JSON.parse(raw) as HistoryEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/**
 * Archives a fetch result as its own versioned file under history/, and
 * appends a matching entry to history/database.json. Called on every
 * successful CLI run (cache hit or fresh fetch) — never overwrites a prior
 * request for the same video, unlike the .cache/ read-through cache.
 */
export async function recordHistory(result: TranscriptResult): Promise<string> {
  await mkdir(HISTORY_DIR, { recursive: true });

  const entries = await readDatabase();
  const iteration = entries.filter((e) => e.videoId === result.videoId).length + 1;
  const extractMethod = EXTRACT_METHOD_LABEL[result.source];
  const filename = `Youtube-${result.videoId}-${extractMethod}-v${iteration}.json`;

  const entry: HistoryEntry = {
    ...result,
    platform: "Youtube",
    extractMethod,
    iteration,
    filename,
  };

  await writeFile(join(HISTORY_DIR, filename), JSON.stringify(entry, null, 2), "utf-8");

  entries.push(entry);
  await writeFile(DATABASE_PATH, JSON.stringify(entries, null, 2), "utf-8");

  return filename;
}
