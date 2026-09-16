import { decodeHtmlEntities } from "../vtt.js";

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string; // "asr" marks an auto-generated track
}

export interface TierResult {
  transcript: string;
  language: string;
}

/**
 * Scrapes the watch page for ytInitialPlayerResponse and reads the caption
 * track list directly — no yt-dlp dependency, so this tier works even on a
 * machine without it installed. Breaks if YouTube changes the page's
 * embedded JSON shape; the extractor tier exists as a more robust fallback.
 */
export async function fetchPublicCaptions(
  videoId: string,
  preferredLang?: string
): Promise<TierResult | null> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var |<\/script)/s);
  if (!match) return null;

  let playerResponse: any;
  try {
    playerResponse = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const tracks: CaptionTrack[] | undefined =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) return null;

  const track = selectTrack(tracks, preferredLang);
  if (!track) return null;

  const captionRes = await fetch(track.baseUrl);
  if (!captionRes.ok) return null;
  const xml = await captionRes.text();

  return { transcript: timedTextXmlToPlainText(xml), language: track.languageCode };
}

function selectTrack(tracks: CaptionTrack[], preferredLang?: string): CaptionTrack | undefined {
  const byLang = preferredLang ? tracks.filter((t) => t.languageCode === preferredLang) : tracks;
  const pool = byLang.length > 0 ? byLang : tracks;

  const manual = pool.find((t) => t.kind !== "asr");
  return manual ?? pool[0];
}

function timedTextXmlToPlainText(xml: string): string {
  const matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  return matches
    .map((m) => decodeHtmlEntities(m[1]).trim())
    .filter(Boolean)
    .join(" ");
}
