import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { vttToPlainText } from "../vtt.js";
import type { TierResult } from "./publicCaptions.js";

const execFileAsync = promisify(execFile);

/**
 * Falls back to yt-dlp when the lightweight page-scrape tier fails (e.g.
 * YouTube changed its embedded JSON shape). Requires yt-dlp on PATH.
 */
export async function fetchViaExtractor(
  videoId: string,
  preferredLang?: string
): Promise<TierResult | null> {
  const workDir = await mkdtemp(join(tmpdir(), "yt-summarizer-"));
  try {
    const lang = preferredLang ?? "en";
    await execFileAsync("yt-dlp", [
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      lang,
      "--sub-format",
      "vtt",
      "--skip-download",
      "-o",
      join(workDir, "%(id)s.%(ext)s"),
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);

    const files = await readdir(workDir);
    const vttFile = files.find((f) => f.endsWith(".vtt"));
    if (!vttFile) return null;

    const vtt = await readFile(join(workDir, vttFile), "utf-8");
    const langMatch = vttFile.match(/\.([a-zA-Z0-9-]+)\.vtt$/);
    return { transcript: vttToPlainText(vtt), language: langMatch?.[1] ?? lang };
  } catch {
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
