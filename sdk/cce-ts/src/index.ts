import { credentials, ChannelCredentials } from "@grpc/grpc-js";

export interface JobManifest {
  jobId: string;
  payload: Uint8Array;
  attestationQuotes: Uint8Array[];
  modelPack: string;
}

export interface RunJobRequest {
  manifest: JobManifest;
  sealedKey?: Uint8Array;
  expectedHash?: Uint8Array;
  clientRegion: string;
  allowEgress?: boolean;
  kmsWrapMaterial?: Uint8Array;
}

export interface RunJobResponse {
  jobId: string;
  resultHash: Uint8Array;
  sealedResult: Uint8Array;
  auditToken: string;
}

export interface RunJobClient {
  runJob(req: RunJobRequest): Promise<RunJobResponse>;
}

class GrpcJsonClient implements RunJobClient {
  private readonly host: string;
  private readonly creds: ChannelCredentials;

  constructor(host: string, creds: ChannelCredentials = credentials.createInsecure()) {
    this.host = host;
    this.creds = creds;
  }

  async runJob(req: RunJobRequest): Promise<RunJobResponse> {
    // This is a thin placeholder that would be replaced by generated bindings.
    // It serializes over JSON for compatibility with the custom server codec.
    const body = JSON.stringify(req);
    const res = await fetch(`http://${this.host}/runJob`, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" }
    });
    if (!res.ok) {
      throw new Error(`CCE runJob failed: ${res.status}`);
    }
    const json = (await res.json()) as RunJobResponse;
    return json;
  }
}

export const createClient = (host: string) => new GrpcJsonClient(host);
