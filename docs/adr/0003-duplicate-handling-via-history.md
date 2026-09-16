# Duplicate handling via history, not cache

Before fetching, the CLI now checks `history/` (not `.cache/`) for an existing entry for the requested video. If one exists, the `--on-duplicate` flag decides what happens: `read` (default) returns it with no network call, `overwrite` replaces the latest entry in place, or `version` fetches and adds a new entry. This replaces the earlier `--refresh` flag, which only ever bypassed `.cache/` to force a re-fetch, always appending a new history entry regardless.

The alternative was keeping both mechanisms — `.cache/` gating the fetch decision and `history/` purely as a log. That was rejected: `--refresh` and a history-based duplicate check would have overlapping, easily-contradictory meanings (what does "bypass the cache" mean once history's existence check is what actually skips the fetch?), and letting two separate stores each partially decide "does this already exist" invites them drifting out of sync. `.cache/` still exists as a mirror of the single latest fetch, but is no longer read from for this decision.

The default (`read`) is also a behavior change from before: previously every successful run appended a new history entry, even a `.cache/`-hit replay. Now, a repeat request for the same video does nothing by default unless `--on-duplicate overwrite` or `version` is passed explicitly.
