#!/usr/bin/env node
import { Command } from "commander";
import { readCache, writeCache } from "./lib/cache.js";
import { runPipeline } from "./lib/pipeline.js";
import { extractVideoId } from "./lib/videoId.js";

const program = new Command();

program
  .name("youtube-summarizer")
  .description("Fetch a YouTube video's transcript for an LLM agent to summarize.")
  .argument("<url>", "YouTube video URL or video ID")
  .option("--lang <code>", "preferred caption language (e.g. en, es)")
  .option("--refresh", "bypass the cache and re-fetch", false)
  .action(async (url: string, options: { lang?: string; refresh: boolean }) => {
    try {
      const videoId = extractVideoId(url);

      if (!options.refresh) {
        const cached = await readCache(videoId);
        if (cached) {
          process.stdout.write(JSON.stringify(cached, null, 2) + "\n");
          return;
        }
      }

      const result = await runPipeline(videoId, options.lang);
      await writeCache(result);
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

program.parse();
