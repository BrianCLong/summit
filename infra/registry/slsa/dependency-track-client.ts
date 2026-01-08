export interface DependencyTrackClientConfig {
  url: string;
  apiKey: string;
}

export interface UploadBomOptions {
  sbom: string;
  projectName: string;
  projectVersion: string;
  autoCreate?: boolean;
  format?: "cyclonedx" | "spdx";
}

export class DependencyTrackClient {
  private readonly endpoint: string;

  constructor(private readonly config: DependencyTrackClientConfig) {
    this.endpoint = `${this.config.url.replace(/\/$/, "")}/api/v1/bom`;
  }

  async uploadBom(options: UploadBomOptions): Promise<string> {
    const fetchFn = globalThis.fetch;
    if (!fetchFn) {
      throw new Error("Fetch API is not available in this runtime");
    }

    const response = await fetchFn(this.endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        projectName: options.projectName,
        projectVersion: options.projectVersion,
        autoCreate: options.autoCreate ?? true,
        format: options.format ?? "cyclonedx",
        bom: Buffer.from(options.sbom).toString("base64"),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dependency-Track upload failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { token?: string };
    if (!payload.token) {
      throw new Error("Dependency-Track did not return an upload token");
    }

    return payload.token;
  }
}
