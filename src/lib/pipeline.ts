import { ConfigurationError } from "./errors.js";
import { fetchMetadata } from "./metadata.js";
import { fetchViaAudioTranscription } from "./tiers/audioTranscription.js";
import { fetchViaExtractor } from "./tiers/extractor.js";
import { fetchOwnedCaptions } from "./tiers/ownedApi.js";
import { fetchPublicCaptions, type TierResult } from "./tiers/publicCaptions.js";
import type { TranscriptResult, TranscriptSource } from "./types.js";

interface Tier {
  source: TranscriptSource;
  run: (videoId: string, lang?: string) => Promise<TierResult | null>;
}

const TIERS: Tier[] = [
  { source: "owned-api", run: fetchOwnedCaptions },
  { source: "extractor", run: fetchViaExtractor },
  { source: "public-captions", run: fetchPublicCaptions },
  { source: "audio-transcription", run: (videoId) => fetchViaAudioTranscription(videoId) },
];

/**
 * @param startTier Skip straight to this tier instead of starting at the
 * top. Earlier, higher-priority tiers are never attempted; later tiers are
 * still tried as a fallback if the requested one fails, so every tier in
 * TIERS runs at most once per call.
 */
export async function runPipeline(
  videoId: string,
  lang?: string,
  startTier?: TranscriptSource
): Promise<TranscriptResult> {
  const metadata = await fetchMetadata(videoId);

  const startIndex = startTier ? TIERS.findIndex((t) => t.source === startTier) : 0;
  const tiersToTry = TIERS.slice(startIndex);

  for (const tier of tiersToTry) {
    let result: TierResult | null;
    try {
      result = await tier.run(videoId, lang);
    } catch (err) {
      if (err instanceof ConfigurationError) throw err;
      result = null;
    }

    if (result && result.transcript.trim().length > 0) {
      return {
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: metadata.title,
        channel: metadata.channel,
        durationSeconds: metadata.durationSeconds,
        chapters: metadata.chapters,
        language: result.language,
        source: tier.source,
        transcript: result.transcript,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  throw new Error(
    `Could not obtain a transcript for ${videoId} — all attempted tiers failed (${tiersToTry
      .map((t) => t.source)
      .join(", ")}).`
  );
}
