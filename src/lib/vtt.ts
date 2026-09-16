export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function vttToPlainText(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("WEBVTT")) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (trimmed.includes("-->")) continue;
    if (/^(Kind|Language):/i.test(trimmed)) continue;
    textLines.push(decodeHtmlEntities(trimmed.replace(/<[^>]+>/g, "")));
  }

  const deduped: string[] = [];
  for (const line of textLines) {
    if (line && line !== deduped[deduped.length - 1]) {
      deduped.push(line);
    }
  }

  return deduped.join(" ").replace(/\s+/g, " ").trim();
}
