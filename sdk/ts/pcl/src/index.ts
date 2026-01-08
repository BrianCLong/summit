import axios, { AxiosInstance } from "axios";

export interface EvidenceInput {
  source: string;
  url?: string;
  blob?: string;
  license?: string;
  hash: string;
}

export interface TransformInput {
  inputs: string[];
  tool: string;
  params: Record<string, any>;
  outputs: string[];
  operatorId: string;
}

export interface ClaimInput {
  subject: string;
  predicate: string;
  object: string;
  evidenceRefs: string[];
  confidence: number;
  licenseId: string;
}

export class PCLClient {
  private client: AxiosInstance;

  constructor(baseURL: string, authorityId?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        "x-authority-id": authorityId || "anonymous",
      },
    });
  }

  async registerEvidence(evidence: EvidenceInput): Promise<string> {
    const res = await this.client.post<{ evidenceId: string }>("/evidence", evidence);
    return res.data.evidenceId;
  }

  async registerTransform(transform: TransformInput): Promise<string> {
    const res = await this.client.post<{ transformId: string }>("/transform", transform);
    return res.data.transformId;
  }

  async registerClaim(claim: ClaimInput): Promise<string> {
    const res = await this.client.post<{ claimId: string }>("/claim", claim);
    return res.data.claimId;
  }

  async getManifest(bundleId: string): Promise<any> {
    const res = await this.client.get(`/manifest/${bundleId}`);
    return res.data;
  }
}
