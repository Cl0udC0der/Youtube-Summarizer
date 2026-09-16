export type TranscriptSource =
  | "public-captions"
  | "owned-api"
  | "extractor"
  | "audio-transcription";

export interface Chapter {
  title: string;
  startSeconds: number;
}

export interface TranscriptResult {
  videoId: string;
  url: string;
  title: string;
  channel: string;
  durationSeconds: number;
  chapters: Chapter[];
  language: string;
  source: TranscriptSource;
  transcript: string;
  fetchedAt: string;
}
