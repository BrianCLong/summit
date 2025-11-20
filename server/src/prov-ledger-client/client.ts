/**
 * Prov-Ledger Service Client
 * HTTP client for communicating with the Provenance & Claims Ledger service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Claim,
  Evidence,
  ProvenanceChain,
  DisclosureBundle,
  Manifest,
  CreateClaimRequest,
  CreateEvidenceRequest,
  CreateProvenanceRequest,
  VerifyHashRequest,
  VerifyHashResponse,
  ProvLedgerError,
} from './types.js';

export interface ProvLedgerClientConfig {
  baseURL: string;
  timeout?: number;
  authorityId: string;
  reasonForAccess: string;
  retries?: number;
}

export class ProvLedgerClient {
  private client: AxiosInstance;
  private config: ProvLedgerClientConfig;

  constructor(config: ProvLedgerClientConfig) {
    this.config = {
      timeout: 5000,
      retries: 3,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-authority-id': this.config.authorityId,
        'x-reason-for-access': this.config.reasonForAccess,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this),
    );
  }

  private async handleError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    const data = error.response?.data as any;

    const provError = new Error(
      data?.error || error.message,
    ) as ProvLedgerError;
    provError.name = 'ProvLedgerError';
    provError.statusCode = status;
    provError.code = data?.code;

    throw provError;
  }

  // ============================================================================
  // Claims API
  // ============================================================================

  /**
   * Register a new claim
   */
  async createClaim(request: CreateClaimRequest): Promise<Claim> {
    const response = await this.client.post<Claim>('/claims', request);
    return response.data;
  }

  /**
   * Get a claim by ID
   */
  async getClaim(id: string): Promise<Claim> {
    const response = await this.client.get<Claim>(`/claims/${id}`);
    return response.data;
  }

  // ============================================================================
  // Evidence API
  // ============================================================================

  /**
   * Register new evidence with checksum and transform chain
   */
  async createEvidence(request: CreateEvidenceRequest): Promise<Evidence> {
    const response = await this.client.post<Evidence>('/evidence', request);
    return response.data;
  }

  /**
   * Get evidence by ID
   */
  async getEvidence(id: string): Promise<Evidence> {
    const response = await this.client.get<Evidence>(`/evidence/${id}`);
    return response.data;
  }

  // ============================================================================
  // Provenance API
  // ============================================================================

  /**
   * Create a provenance chain for a claim
   */
  async createProvenanceChain(
    request: CreateProvenanceRequest,
  ): Promise<ProvenanceChain> {
    const response = await this.client.post<ProvenanceChain>(
      '/provenance',
      request,
    );
    return response.data;
  }

  /**
   * Get provenance chains for a claim
   */
  async getProvenanceChains(claimId: string): Promise<ProvenanceChain[]> {
    const response = await this.client.get<ProvenanceChain[]>('/provenance', {
      params: { claimId },
    });
    return response.data;
  }

  // ============================================================================
  // Bundle API
  // ============================================================================

  /**
   * Get disclosure bundle manifest for a case
   * Returns hash tree and transform chain for all evidence in the case
   */
  async getDisclosureBundle(caseId: string): Promise<DisclosureBundle> {
    const response = await this.client.get<DisclosureBundle>(
      `/bundles/${caseId}`,
    );
    return response.data;
  }

  // ============================================================================
  // Verification API
  // ============================================================================

  /**
   * Verify content hash
   */
  async verifyHash(request: VerifyHashRequest): Promise<VerifyHashResponse> {
    const response = await this.client.post<VerifyHashResponse>(
      '/hash/verify',
      request,
    );
    return response.data;
  }

  /**
   * Get export manifest with all claims
   */
  async getExportManifest(): Promise<Manifest> {
    const response = await this.client.get<Manifest>('/export/manifest');
    return response.data;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Check service health
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
    dependencies: Record<string, string>;
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

/**
 * Factory function to create a ProvLedgerClient instance
 */
export function createProvLedgerClient(
  config: ProvLedgerClientConfig,
): ProvLedgerClient {
  return new ProvLedgerClient(config);
}
