import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface Destination {
  provider: string;
  bucket: string;
  region: string;
}

export interface TransferRequest {
  requestId: string;
  policyId?: string;
  destination: Destination;
  dataClass: string;
  bytes: number;
}

export interface ManifestRecord {
  manifestId: string;
  requestId: string;
  policyId: string;
  destination: Destination;
  dataClass: string;
  bytes: number;
  cost: number;
  timestamp: string;
  signature: string;
  reconciled: boolean;
  providerBytes?: number;
  providerCost?: number;
}

export interface TransferResponse {
  allowed: boolean;
  reason?: string;
  windowEnd?: string;
  manifest?: ManifestRecord;
}

export interface ReconcileRequest {
  providerBytes: number;
  providerCost: number;
}

export class MdegClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.http = axios.create({ baseURL, ...config });
  }

  async requestTransfer(request: TransferRequest): Promise<TransferResponse> {
    const response = await this.http.post<TransferResponse>('/transfers', {
      requestId: request.requestId,
      policyId: request.policyId ?? '',
      destination: request.destination,
      dataClass: request.dataClass,
      bytes: request.bytes,
    });
    return response.data;
  }

  async getManifest(manifestId: string): Promise<ManifestRecord> {
    const response = await this.http.get<ManifestRecord>(`/manifests/${manifestId}`);
    return response.data;
  }

  async reconcileManifest(manifestId: string, reconcile: ReconcileRequest): Promise<ManifestRecord> {
    const response = await this.http.post<ManifestRecord>(
      `/manifests/${manifestId}/reconcile`,
      reconcile,
    );
    return response.data;
  }

  async policies(): Promise<Record<string, unknown>> {
    const response = await this.http.get<Record<string, unknown>>('/policies');
    return response.data;
  }
}

export const createMdegClient = (baseURL: string, config?: AxiosRequestConfig): MdegClient => {
  return new MdegClient(baseURL, config);
};
