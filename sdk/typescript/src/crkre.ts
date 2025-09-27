import axios, { AxiosInstance } from 'axios';

export type BackendKind = 'hsm' | 'kms';

export interface ShareBackendConfig {
  backend: BackendKind;
}

export interface CreateKeyParams {
  jurisdiction: string;
  residency: string;
  purpose: string;
  threshold: number;
  shares: ShareBackendConfig[];
}

export interface ShareProof {
  key_id: string;
  share_id: string;
  jurisdiction: string;
  residency: string;
  purpose: string;
  backend: BackendKind;
  digest: string; // base64
  signature: string; // base64
}

export interface ShareDescriptor {
  share_id: string;
  backend: BackendKind;
  proof: ShareProof;
}

export interface KeyMetadata {
  key_id: string;
  jurisdiction: string;
  residency: string;
  purpose: string;
  threshold: number;
  public_provenance_key: string;
  shares: ShareDescriptor[];
}

export interface EncryptionResult {
  nonce: string; // base64
  ciphertext: string; // base64
}

export interface ProvidedShare {
  share_id: string;
  share: string; // base64
}

export interface DecryptionParams {
  key_id: string;
  jurisdiction: string;
  residency: string;
  purpose: string;
  nonce: string; // base64
  ciphertext: string; // base64
  shares: ProvidedShare[];
}

export interface DecryptionResult {
  plaintext: string; // base64
}

export interface QuorumRecoveryRequest {
  key_id: string;
  shares: ProvidedShare[];
}

export interface QuorumRecoveryResult {
  master_secret: string; // base64
}

export interface EscrowRequest {
  share_ids: string[];
  ttl_seconds: number;
}

export interface EscrowDescriptor {
  escrow_id: string;
  key_id: string;
  expires_at: string;
  share_ids: string[];
}

export interface EscrowMaterial {
  escrow_id: string;
  key_id: string;
  expires_at: string;
  shares: ProvidedShare[];
  proofs: ShareProof[];
}

export class CrkreClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string, instance?: AxiosInstance) {
    this.http = instance ?? axios.create({ baseURL });
  }

  async health(): Promise<boolean> {
    const response = await this.http.get('/health');
    return response.data?.status === 'ok';
  }

  async createKey(params: CreateKeyParams): Promise<KeyMetadata> {
    const { data } = await this.http.post<KeyMetadata>('/keys', params);
    return data;
  }

  async encrypt(request: {
    key_id: string;
    jurisdiction: string;
    residency: string;
    purpose: string;
    plaintext: string; // base64
  }): Promise<EncryptionResult> {
    const { data } = await this.http.post<EncryptionResult>('/encrypt', request);
    return data;
  }

  async decrypt(params: DecryptionParams): Promise<DecryptionResult> {
    const { data } = await this.http.post<DecryptionResult>('/decrypt', params);
    return data;
  }

  async recoverQuorum(request: QuorumRecoveryRequest): Promise<QuorumRecoveryResult> {
    const { data } = await this.http.post<QuorumRecoveryResult>('/quorum/recover', request);
    return data;
  }

  async listProvenance(keyId: string): Promise<ShareProof[]> {
    const { data } = await this.http.get<ShareProof[]>(`/keys/${keyId}/provenance`);
    return data;
  }

  async createEscrow(keyId: string, request: EscrowRequest): Promise<EscrowDescriptor> {
    const { data } = await this.http.post<EscrowDescriptor>(`/keys/${keyId}/escrow`, request);
    return data;
  }

  async fetchEscrow(escrowId: string): Promise<EscrowMaterial> {
    const { data } = await this.http.get<EscrowMaterial>(`/escrow/${escrowId}`);
    return data;
  }
}
