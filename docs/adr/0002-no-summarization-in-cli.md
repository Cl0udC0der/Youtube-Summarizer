# No summarization in the CLI

This CLI fetches and caches transcripts only; it never calls an LLM to generate a summary itself, despite the project's name. Summarization is delegated entirely to whichever agent invokes the tool (e.g. Claude Code, via the accompanying `SKILL.md`). This was a deliberate choice over embedding an Anthropic API call directly in the script, to avoid coupling the tool to a specific LLM provider/API key and to let the invoking agent control summary style, length, and follow-up questions using its own context.
