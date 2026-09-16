# Youtube-Summarizer

A personal CLI that fetches a YouTube video's transcript for an LLM agent to summarize. It stops at the transcript — it does not generate summaries itself.

## Language

**Transcript**:
The canonical text of a video's spoken content, produced by this tool regardless of how it was obtained (captions or audio transcription). The unit handed to the summarizing agent.
_Avoid_: captions, subtitles, transcription (as a stand-in for the general concept)

**Transcript source**:
Which of the four fallback tiers produced a given Transcript — owned-channel API, extractor, public captions, or audio transcription, tried in that order — carried as provenance so the summarizing agent can flag lower-confidence transcripts (e.g. machine-transcribed audio).

**Owned video**:
A video on the user's own YouTube channel, reachable via authenticated OAuth against the YouTube Data API even when unlisted or private. Distinct from a public video, which only ever needs unauthenticated access. The OAuth token is supplied by the user via an environment variable; this tool never stores or refreshes it.

**Summary**:
Not produced by this codebase. The output an external LLM agent generates after consuming a Transcript. Explicitly out of scope — no summarization logic or LLM API integration belongs in this tool.

**Caption track**:
One of possibly several language/quality variants YouTube exposes for a video (manual vs. auto-generated, multiple languages). This tool prefers a manually-created track in the video's original language by default; `--lang` selects a specific track.

**History entry**:
A durable, versioned record of a single transcript fetch, written to `history/` on every successful run and never overwritten — repeated fetches of the same video get incrementing iterations instead. Distinct from the Transcript cache in `.cache/`, which holds only the most recent fetch per video and exists purely to skip redundant re-fetching, not as a record.
