const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 80;

export interface Spinner {
  stop: () => void;
}

/**
 * Stderr-only progress indicator. Animates live when stderr is a TTY (a
 * human watching a real terminal); stays silent otherwise, since a \r-based
 * redraw dumped into a piped/captured stream (the common case — an agent
 * invoking this CLI as a subprocess, per SKILL.md) just prints every frame
 * as its own line instead of overwriting in place.
 */
export function startSpinner(label: string, startedAt: number): Spinner {
  if (!process.stderr.isTTY) {
    return { stop: () => {} };
  }

  let frame = 0;
  const render = () => {
    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    process.stderr.write(`\r\x1b[K${FRAMES[frame]} ${label}... ${elapsedSeconds}s`);
    frame = (frame + 1) % FRAMES.length;
  };

  render();
  const timer = setInterval(render, INTERVAL_MS);

  return {
    stop: () => {
      clearInterval(timer);
      process.stderr.write("\r\x1b[K");
    },
  };
}
