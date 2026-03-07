import fs from "node:fs";

export function readEventPayload(): any {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return {};
  return JSON.parse(fs.readFileSync(eventPath, "utf8"));
}

export function getRepoSlug(): string {
  return process.env.GITHUB_REPOSITORY || "unknown/unknown";
}

export function getRunMeta() {
  return {
    actor: process.env.GITHUB_ACTOR || "unknown",
    sha: process.env.GITHUB_SHA || "unknown",
    runId: process.env.GITHUB_RUN_ID || "unknown",
    eventName: process.env.GITHUB_EVENT_NAME || "unknown",
    repo: getRepoSlug(),
  };
}
