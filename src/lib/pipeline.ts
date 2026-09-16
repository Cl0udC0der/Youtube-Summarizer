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
  { source: "public-captions", run: fetchPublicCaptions },
  { source: "owned-api", run: fetchOwnedCaptions },
  { source: "extractor", run: fetchViaExtractor },
  { source: "audio-transcription", run: (videoId) => fetchViaAudioTranscription(videoId) },
];

export async function runPipeline(videoId: string, lang?: string): Promise<TranscriptResult> {
  const metadata = await fetchMetadata(videoId);

  for (const tier of TIERS) {
    const result = await tier.run(videoId, lang);
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
    `Could not obtain a transcript for ${videoId} — all tiers failed (public captions, owned-channel API, yt-dlp extractor, audio transcription).`
  );
}
