export interface ReleaseArtifact {
  name: string;
  path: string;
  checksum?: string;
}

export interface ReleaseStatus {
  tag: string;
  sha: string;
  generated_at: string;
  artifacts: ReleaseArtifact[];
  by: string;
}

export interface ReleaseBundle {
  manifest: ReleaseStatus;
  checksums: Record<string, string>;
}

export function parseManifest(jsonString: string): ReleaseStatus {
  try {
    const data = JSON.parse(jsonString);
    // Basic validation could go here
    if (!data.tag || !data.sha) {
      throw new Error("Invalid manifest: missing tag or sha");
    }
    return data as ReleaseStatus;
  } catch (e) {
    throw new Error(`Failed to parse manifest: ${(e as Error).message}`);
  }
}

export function parseChecksums(content: string): Record<string, string> {
  const lines = content.split("\n");
  const result: Record<string, string> = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const sha = parts[0];
      const file = parts.slice(1).join(" ");
      result[file] = sha;
    }
  }
  return result;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}
