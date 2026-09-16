#!/usr/bin/env node
import { Command, Option } from "commander";
import { writeCache } from "./lib/cache.js";
import {
  findLatestHistoryEntry,
  overwriteLatestHistory,
  readHistoryFile,
  recordHistory,
} from "./lib/history.js";
import { runPipeline } from "./lib/pipeline.js";
import { extractVideoId } from "./lib/videoId.js";

type OnDuplicateMode = "read" | "overwrite" | "version";

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
  .action(async (url: string, options: { lang?: string; onDuplicate: OnDuplicateMode }) => {
    try {
      const videoId = extractVideoId(url);
      const existing = await findLatestHistoryEntry(videoId);

      if (existing && options.onDuplicate === "read") {
        const full = await readHistoryFile(existing.filename);
        process.stdout.write(JSON.stringify(full, null, 2) + "\n");
        return;
      }

      const result = await runPipeline(videoId, options.lang);
      await writeCache(result);

      const filename =
        existing && options.onDuplicate === "overwrite"
          ? await overwriteLatestHistory(existing, result)
          : await recordHistory(result);
      console.error(`Saved to history/${filename}`);

      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

program.parse();
