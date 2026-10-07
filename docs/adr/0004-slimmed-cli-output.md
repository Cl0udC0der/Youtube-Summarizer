# Slimmed CLI output

The CLI's stdout is now a small summary object (`savedTo`, `processTimeMs`, title/channel/duration/language/source/`fetchedAt`, `chapterCount`) rather than the full `TranscriptResult` — no chapter list, no transcript text. This applies identically to a fresh fetch and to a cache hit (`--on-duplicate read` returning an existing entry).

This was chosen over continuing to print the full record because the full record was already being written to `history/<file>.json` on every fetch — printing it a second time to the terminal only duplicated data that's already safely persisted, and for a long transcript that duplication could be the bulk of the CLI's output. `savedTo` names where the full record actually lives, so nothing is lost — a consumer that needs the transcript or the real chapter list reads it from that file instead of from stdout.

This is a real change to the output contract (see `SKILL.md`), not just a formatting tweak: the agent invoking this CLI must now open `savedTo` for the transcript rather than reading it directly off stdout. It also lets a progress spinner report elapsed time (`processTimeMs`) honestly, including for a cache hit, where it reflects the (near-instant) lookup rather than a network/subprocess fetch.
