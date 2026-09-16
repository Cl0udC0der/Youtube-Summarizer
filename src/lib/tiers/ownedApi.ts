import { vttToPlainText } from "../vtt.js";
import type { TierResult } from "./publicCaptions.js";

const API_BASE = "https://www.googleapis.com/youtube/v3";

interface CaptionResource {
  id: string;
  snippet: { trackKind: string; language: string };
}

/**
 * Reaches videos on the user's own channel (unlisted/private) that public
 * scraping can't. Reads the OAuth token from YOUTUBE_OAUTH_TOKEN — this tool
 * never stores or refreshes it (see docs/adr and CONTEXT.md: "Owned video").
 */
export async function fetchOwnedCaptions(
  videoId: string,
  preferredLang?: string
): Promise<TierResult | null> {
  const token = process.env.YOUTUBE_OAUTH_TOKEN;
  if (!token) return null;

  const listRes = await fetch(`${API_BASE}/captions?part=snippet&videoId=${videoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) return null;

  const { items } = (await listRes.json()) as { items: CaptionResource[] };
  if (!items || items.length === 0) return null;

  const track = selectCaptionResource(items, preferredLang);

  const downloadRes = await fetch(`${API_BASE}/captions/${track.id}?tfmt=vtt`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!downloadRes.ok) return null;

  const vtt = await downloadRes.text();
  return { transcript: vttToPlainText(vtt), language: track.snippet.language };
}

function selectCaptionResource(
  items: CaptionResource[],
  preferredLang?: string
): CaptionResource {
  const byLang = preferredLang
    ? items.filter((i) => i.snippet.language === preferredLang)
    : items;
  const pool = byLang.length > 0 ? byLang : items;

  const manual = pool.find((i) => i.snippet.trackKind === "standard");
  return manual ?? pool[0];
}
