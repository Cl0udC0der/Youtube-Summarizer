import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { TierResult } from "./publicCaptions.js";

const execFileAsync = promisify(execFile);

/**
 * Last resort: downloads audio via yt-dlp, transcribes it with a local
 * whisper.cpp binary. Expected to fire rarely — most videos have captions.
 * WHISPER_BIN defaults to "whisper-cli"; WHISPER_MODEL must point at a
 * whisper.cpp .bin model file (no default — model choice is a size/speed
 * trade-off the user needs to make explicitly).
 */
export async function fetchViaAudioTranscription(videoId: string): Promise<TierResult | null> {
  const whisperBin = process.env.WHISPER_BIN ?? "whisper-cli";
  const whisperModel = process.env.WHISPER_MODEL;
  if (!whisperModel) {
    throw new Error(
      "WHISPER_MODEL is not set — point it at a whisper.cpp .bin model file to enable audio transcription."
    );
  }

  const workDir = await mkdtemp(join(tmpdir(), "yt-summarizer-audio-"));
  try {
    await execFileAsync("yt-dlp", [
      "-x",
      "--audio-format",
      "wav",
      "-o",
      join(workDir, "audio.%(ext)s"),
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);

    const audioPath = join(workDir, "audio.wav");
    const outputPath = join(workDir, "transcript");
    await execFileAsync(whisperBin, ["-m", whisperModel, "-f", audioPath, "-otxt", "-of", outputPath]);

    const transcript = await readFile(`${outputPath}.txt`, "utf-8");
    return { transcript: transcript.trim(), language: "unknown" };
  } catch {
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
