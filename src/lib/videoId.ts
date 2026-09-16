const ID_PATTERN = /(?:v=|\/embed\/|\/v\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractVideoId(input: string): string {
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Not a valid YouTube URL or video ID: ${input}`);
  }

  if (url.hostname === "youtu.be") {
    const id = url.pathname.slice(1);
    if (id) return id;
  }

  const vParam = url.searchParams.get("v");
  if (vParam) return vParam;

  const match = trimmed.match(ID_PATTERN);
  if (match) return match[1];

  throw new Error(`Could not extract a video ID from: ${input}`);
}
