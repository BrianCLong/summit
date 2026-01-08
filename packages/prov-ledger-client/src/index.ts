/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";

export interface Evidence {
  evidenceId?: string;
  source: string;
  url?: string;
  blob?: string;
  license?: string;
  hash: string;
  caseId?: string;
}

export interface DisclosureBundle {
  bundleId: string;
  merkleRoot: string;
  entries: any[];
}

export class ProvLedgerClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({ baseURL });
    axiosRetry(this.client, { retries: 3 });
  }

  async registerEvidence(evidence: Evidence): Promise<string> {
    const res = await this.client.post("/evidence", evidence);
    return res.data.evidenceId;
  }

  async exportBundle(caseId: string): Promise<DisclosureBundle> {
    const res = await this.client.get(`/bundle/${caseId}/export`);
    return res.data;
  }
}
