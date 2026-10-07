#!/usr/bin/env node
import { Command, Option } from "commander";
import { writeCache } from "./lib/cache.js";
import {
  findLatestHistoryEntry,
  overwriteLatestHistory,
  recordHistory,
} from "./lib/history.js";
import { runPipeline } from "./lib/pipeline.js";
import { startSpinner } from "./lib/spinner.js";
import type { Chapter, TranscriptSource } from "./lib/types.js";
import { extractVideoId } from "./lib/videoId.js";

type OnDuplicateMode = "read" | "overwrite" | "version";
const TRANSCRIPT_SOURCES: TranscriptSource[] = [
  "owned-api",
  "extractor",
  "public-captions",
  "audio-transcription",
];

/** The fields a slimmed CLI summary is built from — satisfied structurally
 * by both a fresh TranscriptResult and a cached HistoryIndexEntry. */
interface Summarizable {
  videoId: string;
  url: string;
  title: string;
  channel: string;
  durationSeconds: number;
  chapters: Chapter[];
  language: string;
  source: TranscriptSource;
  fetchedAt: string;
}

function formatProcessTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hours = pad(Math.floor(totalSeconds / 3600));
  const minutes = pad(Math.floor((totalSeconds % 3600) / 60));
  const seconds = pad(totalSeconds % 60);
  return `${ms}ms (${hours}:${minutes}:${seconds})`;
}

/**
 * The full record (chapters, transcript) already lives in history/<file> —
 * this is what actually reaches the terminal/stdout, so it stays slim:
 * chapters become a count, transcript is omitted. A consumer that needs the
 * full transcript reads it from savedTo.
 */
function toSummary(entry: Summarizable, savedTo: string, processTimeMs: number) {
  return {
    savedTo,
    processTimeMs: formatProcessTime(processTimeMs),
    videoId: entry.videoId,
    url: entry.url,
    title: entry.title,
    channel: entry.channel,
    durationSeconds: entry.durationSeconds,
    chapterCount: entry.chapters.length,
    language: entry.language,
    source: entry.source,
    fetchedAt: entry.fetchedAt,
  };
}

const program = new Command();

program
  .name("youtube-summarizer")
  .description("Fetch a YouTube video's transcript for an LLM agent to summarize.")
  .argument("<url>", "YouTube video URL or video ID")
  .option("--lang <code>", "preferred caption language (e.g. en, es)")
  .addOption(
    new Option(
      "--on-duplicate <mode>",
      "how to handle a video already in history: read it as-is (default), overwrite the latest entry with a fresh fetch, or fetch and save as a new version"
    )
      .choices(["read", "overwrite", "version"])
      .default("read")
  )
  .addOption(
    new Option(
      "--tier <name>",
      "skip straight to this transcript tier instead of starting from owned-api; later tiers still run as fallback if it fails"
    ).choices(TRANSCRIPT_SOURCES)
  )
  .action(
    async (
      url: string,
      options: { lang?: string; onDuplicate: OnDuplicateMode; tier?: TranscriptSource }
    ) => {
      const startedAt = Date.now();
      try {
        const videoId = extractVideoId(url);
        const existing = await findLatestHistoryEntry(videoId);

        if (existing && options.onDuplicate === "read") {
          if (options.tier) {
            console.error(
              `History entry already exists for ${videoId} — returning cached entry as-is (--tier ignored; use --on-duplicate overwrite or version to force a fresh fetch).`
            );
          }
          const summary = toSummary(
            existing,
            `history/${existing.filename}`,
            Date.now() - startedAt
          );
          process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
          return;
        }

        const spinner = startSpinner("Fetching transcript", startedAt);
        let result;
        try {
          result = await runPipeline(videoId, options.lang, options.tier);
        } finally {
          spinner.stop();
        }
        await writeCache(result);

        const filename =
          existing && options.onDuplicate === "overwrite"
            ? await overwriteLatestHistory(existing, result)
            : await recordHistory(result);

        const summary = toSummary(result, `history/${filename}`, Date.now() - startedAt);
        process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    }
  );

program.parse();
