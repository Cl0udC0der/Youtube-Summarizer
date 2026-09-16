---
name: youtube-summarizer
description: "Fetch a YouTube video's transcript (title, channel, chapters, transcript text, source provenance) as JSON, given a video URL. Use when the user gives a YouTube link and asks for a summary, key points, or TL;DR — this fetches the transcript for you to then summarize yourself; it does not summarize."
---

# YouTube Summarizer

Fetches a YouTube video's transcript for you to summarize — it never generates a summary itself (see `docs/adr/0002-no-summarization-in-cli.md`).

## When to use

The user shares a YouTube URL and asks for a summary, key points, TL;DR, or "what's this video about." Run the CLI to get the transcript, then write the summary yourself from its output.

## How to invoke

```
youtube-summarizer <url> [--lang <code>] [--on-duplicate <read|overwrite|version>]
```

- `<url>` — a full YouTube URL or a bare 11-character video ID
- `--lang <code>` — prefer a specific caption language (defaults to the video's original language, manually-created captions preferred over auto-generated)
- `--on-duplicate` — what to do if this video's already been fetched before (checked against `history/`, not `.cache/`): `read` (default) returns the existing transcript with no network call; `overwrite` re-fetches and replaces the latest saved entry in place; `version` re-fetches and saves it as a new entry alongside the old ones. Only matters on a repeat request — a video's first fetch always happens regardless of this flag. You generally don't need to pass this: if the user just wants a summary, the default `read` behavior is what you want, even on a second request for the same video in the same conversation.

Output is JSON on stdout:

```json
{
  "videoId": "...",
  "url": "...",
  "title": "...",
  "channel": "...",
  "durationSeconds": 0,
  "chapters": [{ "title": "...", "startSeconds": 0 }],
  "language": "en",
  "source": "public-captions",
  "transcript": "...",
  "fetchedAt": "..."
}
```

## Reading the result

- `source` tells you provenance: `public-captions` and `owned-api` are official captions (reliable); `extractor` is yt-dlp-scraped captions (reliable); `audio-transcription` is machine-transcribed from audio (may contain errors — caveat the summary if you cite exact wording).
- `chapters`, when present, are a good basis for a chaptered/structured summary instead of one flat block.
- If the command exits non-zero, all four transcript tiers failed (private/region-locked/deleted video, or missing local dependencies like `yt-dlp`/Whisper) — read stderr and relay the reason rather than guessing.
