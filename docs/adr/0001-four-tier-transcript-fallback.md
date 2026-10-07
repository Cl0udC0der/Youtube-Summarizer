# Four-tier transcript fallback

Transcript acquisition tries four sources in order — authenticated YouTube Data API for owned videos, `yt-dlp` extraction, public timed-text/player captions, then local Whisper transcription of downloaded audio — falling through only when the prior tier fails. This was chosen over a simpler single-source approach (e.g. captions-only, or always using `yt-dlp`) to maximize coverage: the owner-authenticated tier reaches unlisted/private videos on the user's own channel that no public method can, `yt-dlp` is actively maintained to keep working against YouTube's anti-scraping changes, and local Whisper is a last resort that trades speed for zero cost/dependency on a hosted API.

The public-captions tier (a direct page scrape + timedtext fetch, no subprocess) was originally tier 1 for its speed, but testing found YouTube's anti-bot signature check silently returns an empty body for this technique — it now fails reliably, so it was demoted below `yt-dlp` (which actively works around the same anti-bot mechanism) rather than removed, since it costs nothing to keep as a fast-path opportunist for whenever it does work.

## Configurable entry point

The pipeline always starts at tier 1 by default, but `--tier` lets a caller start at any named tier instead, still falling through to later tiers on failure. Earlier (higher-priority) tiers are skipped entirely rather than deferred — they are never attempted on that run — and the requested tier itself is only ever attempted once, not retried if the fallthrough reaches it again, since every tier in the fixed order only appears once past the chosen starting point. This keeps the "always exactly once per tier per run" property intact; it only changes which tiers are eligible to run at all.
