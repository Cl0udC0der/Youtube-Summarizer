# Youtube-Summarizer

Fetches a YouTube video's transcript for an LLM agent to summarize. It stops at the transcript — see `CONTEXT.md` and `docs/adr/` for the full design.

## Setup

```
npm install
npm run build
npm link
```

`npm link` gives you a global `youtube-summarizer` command backed by this repo (see `docs/adr/` for why, not a registry publish).

## Usage

```
youtube-summarizer <url> [--lang <code>] [--on-duplicate <read|overwrite|version>]
```

Outputs JSON (title, channel, chapters, transcript, source provenance) to stdout. See `SKILL.md` for the full output contract and how an agent should consume it.

Before fetching, the CLI checks `history/` for an existing entry for that video. If none exists, it always fetches and saves the first entry regardless of `--on-duplicate`. If one does exist, `--on-duplicate` controls what happens:

- `read` (default) — return the existing entry as-is; no fetch, no writes.
- `overwrite` — fetch fresh and replace the latest history entry's file and database record in place (same iteration number).
- `version` — fetch fresh and save it as a new iteration, leaving prior entries untouched.

## History

Every fetch that isn't a `read`-mode hit is archived to `history/`, one file per request:

```
history/Youtube-<videoId>-<extractMethod>-v<iteration>.json
```

`history/database.json` is a single JSON array with one index entry per history file — same fields, minus the transcript text — for searching without opening each file individually. The transcript itself only lives in its own per-request file. `.cache/<videoId>.json` still mirrors the single latest fetch per video, but only `history/database.json` is consulted to decide whether a video's already been fetched.

`history/` is gitignored — it's a local, potentially large personal archive, not something meant to be committed.

## Optional env vars

- `YOUTUBE_OAUTH_TOKEN` — enables the owned-channel tier (unlisted/private videos on your own channel). You manage obtaining/refreshing this token yourself; the tool only reads it.
- `WHISPER_BIN` / `WHISPER_MODEL` — enables the last-resort local-audio-transcription tier. See below.

## Local Whisper setup (optional)

The audio-transcription tier only fires when a video has no captions available anywhere (public, owned-channel, or via `yt-dlp` extraction) — rare, so you don't need this set up to use the tool day-to-day.

### 1. Get the `whisper-cli` binary

Check the [whisper.cpp Releases page](https://github.com/ggml-org/whisper.cpp/releases) first for a prebuilt Windows binary. Otherwise, build from source:

**Prerequisites**: `git`, `cmake`, and a C++ compiler (Visual Studio Build Tools with the "Desktop development with C++" workload). `choco install cmake git` if you don't already have them.

```powershell
git clone https://github.com/ggml-org/whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

The binary lands at `build\bin\Release\whisper-cli.exe`.

### 2. Get a model

Model files (`.bin`, GGML format) aren't bundled — download from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main). `ggml-base.en.bin` (~150MB, English-only, fast) is a reasonable default for a fallback tier that rarely triggers; `ggml-small.bin` (~500MB) for multilingual or better accuracy. Bigger models get slow on CPU without a GPU.

### 3. Point the env vars at them

```powershell
$env:WHISPER_BIN = "C:\path\to\whisper.cpp\build\bin\Release\whisper-cli.exe"
$env:WHISPER_MODEL = "C:\path\to\ggml-base.en.bin"
```

Use `setx` or the System Environment Variables GUI to persist these once you're happy with the setup.

### 4. Sanity check before relying on it

```powershell
& $env:WHISPER_BIN -m $env:WHISPER_MODEL -f some-sample.wav -otxt -of out
```

Should produce `out.txt` with the transcription — this is the exact invocation `src/lib/tiers/audioTranscription.ts` makes, so if this works standalone, tier 4 will work through the CLI too.
