/**
 * Thrown by a tier when it can't run because of missing/invalid setup (env
 * vars, binaries) rather than a per-video runtime miss. The pipeline
 * re-throws this immediately instead of falling through to the next tier,
 * since retrying other tiers won't fix a configuration problem.
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
