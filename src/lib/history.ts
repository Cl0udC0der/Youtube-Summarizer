import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

/** database.json's shape — same fields as a HistoryEntry, minus the transcript text. */
export type HistoryIndexEntry = Omit<HistoryEntry, "transcript">;

function toIndexEntry(entry: HistoryEntry): HistoryIndexEntry {
  const { transcript: _transcript, ...index } = entry;
  return index;
}

async function readDatabase(): Promise<HistoryIndexEntry[]> {
  try {
    const raw = await readFile(DATABASE_PATH, "utf-8");
    return JSON.parse(raw) as HistoryIndexEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/**
 * The most recent history entry for a video, or null if it's never been
 * fetched. This is the existence check the CLI's --on-duplicate flag acts
 * on — not .cache/, which only mirrors the latest fetch and isn't queried
 * for this decision. Read from database.json, so it never carries transcript
 * text; use readHistoryFile() for the full record.
 */
export async function findLatestHistoryEntry(videoId: string): Promise<HistoryIndexEntry | null> {
  const entries = await readDatabase();
  const matches = entries.filter((e) => e.videoId === videoId);
  if (matches.length === 0) return null;
  return matches.reduce((latest, e) => (e.iteration > latest.iteration ? e : latest));
}

/** Reads a full history entry (including transcript) from its per-request file under history/. */
export async function readHistoryFile(filename: string): Promise<HistoryEntry> {
  const raw = await readFile(join(HISTORY_DIR, filename), "utf-8");
  return JSON.parse(raw) as HistoryEntry;
}

/**
 * Archives a fetch result as a new versioned file under history/ (full
 * record, including transcript), and appends a transcript-free index entry
 * to history/database.json. Never overwrites a prior request for the same
 * video — each call is a new iteration.
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

  entries.push(toIndexEntry(entry));
  await writeFile(DATABASE_PATH, JSON.stringify(entries, null, 2), "utf-8");

  return filename;
}

/**
 * Replaces an existing history entry's file and database record in place,
 * keeping its iteration number. If the new fetch came from a different tier
 * than the one being replaced, the filename's extractMethod segment is
 * updated to match — and the old file renamed — so the filename never lies
 * about which tier produced its content.
 */
export async function overwriteLatestHistory(
  existing: HistoryIndexEntry,
  result: TranscriptResult
): Promise<string> {
  await mkdir(HISTORY_DIR, { recursive: true });

  const entries = await readDatabase();
  const extractMethod = EXTRACT_METHOD_LABEL[result.source];
  const filename = `Youtube-${result.videoId}-${extractMethod}-v${existing.iteration}.json`;

  const entry: HistoryEntry = {
    ...result,
    platform: "Youtube",
    extractMethod,
    iteration: existing.iteration,
    filename,
  };

  if (filename !== existing.filename) {
    await rm(join(HISTORY_DIR, existing.filename), { force: true });
  }
  await writeFile(join(HISTORY_DIR, filename), JSON.stringify(entry, null, 2), "utf-8");

  const index = entries.findIndex(
    (e) => e.videoId === existing.videoId && e.iteration === existing.iteration
  );
  const indexEntry = toIndexEntry(entry);
  if (index === -1) {
    entries.push(indexEntry);
  } else {
    entries[index] = indexEntry;
  }
  await writeFile(DATABASE_PATH, JSON.stringify(entries, null, 2), "utf-8");

  return filename;
}
