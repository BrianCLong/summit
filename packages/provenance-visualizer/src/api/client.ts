import axios, { AxiosInstance } from 'axios';
import type {
  Claim,
  Evidence,
  ProvenanceChain,
  DisclosureBundle,
  VerificationResult,
} from '../types';

export class ProvenanceLedgerClient {
  private client: AxiosInstance;

  constructor(baseURL: string, authorityId?: string, reasonForAccess?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(authorityId && { 'X-Authority-Id': authorityId }),
        ...(reasonForAccess && { 'X-Reason-For-Access': reasonForAccess }),
      },
    });
  }

  /**
   * Get claim by ID
   */
  async getClaim(id: string): Promise<Claim> {
    const response = await this.client.get(`/claims/${id}`);
    return response.data;
  }

  /**
   * Get evidence by ID
   */
  async getEvidence(id: string): Promise<Evidence> {
    const response = await this.client.get(`/evidence/${id}`);
    return response.data;
  }

  /**
   * Get provenance chain for a claim
   */
  async getProvenanceChain(claimId: string): Promise<ProvenanceChain[]> {
    const response = await this.client.get('/provenance', {
      params: { claimId },
    });
    return response.data;
  }

  /**
   * Get disclosure bundle for a case
   */
  async getDisclosureBundle(caseId: string): Promise<DisclosureBundle> {
    const response = await this.client.get(`/bundles/${caseId}`);
    return response.data;
  }

  /**
   * Verify hash
   */
  async verifyHash(content: any, expectedHash: string): Promise<VerificationResult> {
    const response = await this.client.post('/hash/verify', {
      content,
      expectedHash,
    });
    return response.data;
  }

  /**
   * Export manifest
   */
  async exportManifest(): Promise<any> {
    const response = await this.client.get('/export/manifest');
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
}
