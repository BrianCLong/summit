/**
 * External System Connectors
 *
 * Integration interfaces for border control, law enforcement,
 * visa systems, and other external biometric systems.
 */

import { BiometricPerson, BiometricTemplate, MatchResult } from './types.js';

// ============================================================================
// Common Types
// ============================================================================

export interface ConnectorConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  timeout: number;
  retryCount: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

export interface ConnectorResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    latency: number;
  };
}

export interface DataExchange {
  exchangeId: string;
  sourceSystem: string;
  targetSystem: string;
  dataType: string;
  recordCount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  errors?: string[];
}

// ============================================================================
// Base Connector
// ============================================================================

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected connected: boolean = false;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  /**
   * Execute request with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.config.retryCount
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw lastError;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected generateRequestId(): string {
    return crypto.randomUUID();
  }
}

// ============================================================================
// Border Control Connector
// ============================================================================

export interface BorderControlQuery {
  documentNumber?: string;
  biometricTemplate?: BiometricTemplate;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
}

export interface BorderControlResult {
  found: boolean;
  travelHistory: Array<{
    date: string;
    port: string;
    direction: 'ENTRY' | 'EXIT';
    country: string;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  clearance: 'CLEARED' | 'SECONDARY' | 'DENIED' | 'MANUAL_CHECK';
}

export class BorderControlConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super({
      ...config,
      name: config.name || 'border-control'
    });
  }

  async connect(): Promise<boolean> {
    // Simulate connection
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  /**
   * Query border control system
   */
  async query(query: BorderControlQuery): Promise<ConnectorResponse<BorderControlResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Simulate API call
      await this.delay(100);

      const result: BorderControlResult = {
        found: Math.random() > 0.3,
        travelHistory: [
          {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            port: 'JFK',
            direction: 'ENTRY',
            country: 'US'
          }
        ],
        alerts: [],
        clearance: 'CLEARED'
      };

      return {
        success: true,
        data: result,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          latency: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BORDER_QUERY_FAILED',
          message: (error as Error).message
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          latency: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Submit encounter
   */
  async submitEncounter(encounter: {
    personId: string;
    location: string;
    direction: 'ENTRY' | 'EXIT';
    biometricCapture?: BiometricTemplate;
  }): Promise<ConnectorResponse<{ encounterId: string }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    return {
      success: true,
      data: { encounterId: crypto.randomUUID() },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// Law Enforcement Connector
// ============================================================================

export interface LawEnforcementQuery {
  personId?: string;
  biometricTemplate?: BiometricTemplate;
  caseNumber?: string;
  searchType: 'PERSON' | 'CASE' | 'BIOMETRIC';
}

export interface LawEnforcementResult {
  found: boolean;
  records: Array<{
    recordId: string;
    type: 'ARREST' | 'CONVICTION' | 'WARRANT' | 'ALERT' | 'INVESTIGATION';
    status: 'ACTIVE' | 'CLOSED' | 'PENDING';
    date: string;
    jurisdiction: string;
    description: string;
  }>;
  warrants: Array<{
    warrantId: string;
    type: string;
    issuingAuthority: string;
    issueDate: string;
    charges: string[];
  }>;
  matchConfidence?: number;
}

export class LawEnforcementConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super({
      ...config,
      name: config.name || 'law-enforcement'
    });
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  /**
   * Search law enforcement databases
   */
  async search(query: LawEnforcementQuery): Promise<ConnectorResponse<LawEnforcementResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      await this.delay(150);

      const result: LawEnforcementResult = {
        found: Math.random() > 0.7,
        records: [],
        warrants: [],
        matchConfidence: query.biometricTemplate ? 0.92 : undefined
      };

      if (result.found && Math.random() > 0.8) {
        result.warrants.push({
          warrantId: crypto.randomUUID(),
          type: 'ARREST',
          issuingAuthority: 'Federal District Court',
          issueDate: new Date().toISOString(),
          charges: ['Fraud', 'Identity Theft']
        });
      }

      return {
        success: true,
        data: result,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          latency: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LE_SEARCH_FAILED',
          message: (error as Error).message
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          latency: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Submit hit notification
   */
  async notifyHit(data: {
    sourceSystem: string;
    personId: string;
    matchType: string;
    confidence: number;
    location: string;
  }): Promise<ConnectorResponse<{ notificationId: string }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    return {
      success: true,
      data: { notificationId: crypto.randomUUID() },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// Visa and Immigration Connector
// ============================================================================

export interface VisaQuery {
  applicationNumber?: string;
  passportNumber?: string;
  fullName?: string;
  nationality?: string;
}

export interface VisaResult {
  found: boolean;
  applications: Array<{
    applicationId: string;
    type: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'REVOKED';
    submittedDate: string;
    decisionDate?: string;
    validFrom?: string;
    validTo?: string;
    entries: 'SINGLE' | 'MULTIPLE';
  }>;
  immigrationStatus?: {
    status: string;
    validUntil?: string;
    restrictions?: string[];
  };
}

export class VisaImmigrationConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super({
      ...config,
      name: config.name || 'visa-immigration'
    });
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  /**
   * Query visa/immigration status
   */
  async query(query: VisaQuery): Promise<ConnectorResponse<VisaResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    const result: VisaResult = {
      found: Math.random() > 0.2,
      applications: [
        {
          applicationId: crypto.randomUUID(),
          type: 'B1/B2',
          status: 'APPROVED',
          submittedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          decisionDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          entries: 'MULTIPLE'
        }
      ]
    };

    return {
      success: true,
      data: result,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// Financial KYC Connector
// ============================================================================

export interface KYCQuery {
  identityId?: string;
  fullName?: string;
  dateOfBirth?: string;
  taxId?: string;
  nationality?: string;
}

export interface KYCResult {
  found: boolean;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'FAILED' | 'EXPIRED';
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  sanctions: {
    isListed: boolean;
    lists?: string[];
  };
  pep: {
    isPEP: boolean;
    category?: string;
    position?: string;
  };
  adverseMedia: {
    hasHits: boolean;
    count?: number;
  };
  lastVerified?: string;
}

export class FinancialKYCConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super({
      ...config,
      name: config.name || 'financial-kyc'
    });
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  /**
   * Perform KYC check
   */
  async check(query: KYCQuery): Promise<ConnectorResponse<KYCResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    const result: KYCResult = {
      found: true,
      verificationStatus: 'VERIFIED',
      riskRating: 'LOW',
      sanctions: {
        isListed: Math.random() > 0.95
      },
      pep: {
        isPEP: Math.random() > 0.9
      },
      adverseMedia: {
        hasHits: Math.random() > 0.85,
        count: Math.random() > 0.85 ? Math.floor(Math.random() * 5) : undefined
      },
      lastVerified: new Date().toISOString()
    };

    return {
      success: true,
      data: result,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// INTERPOL Connector
// ============================================================================

export interface InterpolQuery {
  familyName?: string;
  forename?: string;
  nationality?: string;
  dateOfBirth?: string;
  biometricTemplate?: BiometricTemplate;
}

export interface InterpolResult {
  found: boolean;
  notices: Array<{
    noticeId: string;
    type: 'RED' | 'YELLOW' | 'BLUE' | 'BLACK' | 'GREEN' | 'ORANGE' | 'PURPLE';
    status: 'ACTIVE' | 'CANCELLED';
    issuingCountry: string;
    issueDate: string;
    charges?: string[];
  }>;
  stolenDocuments: Array<{
    documentType: string;
    documentNumber: string;
    issuingCountry: string;
    reportedDate: string;
  }>;
}

export class InterpolConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super({
      ...config,
      name: config.name || 'interpol'
    });
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  /**
   * Search INTERPOL databases
   */
  async search(query: InterpolQuery): Promise<ConnectorResponse<InterpolResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    const result: InterpolResult = {
      found: Math.random() > 0.9,
      notices: [],
      stolenDocuments: []
    };

    if (result.found) {
      result.notices.push({
        noticeId: `I-${Date.now()}`,
        type: 'RED',
        status: 'ACTIVE',
        issuingCountry: 'XX',
        issueDate: new Date().toISOString(),
        charges: ['International Fraud']
      });
    }

    return {
      success: true,
      data: result,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// Unified Connector Manager
// ============================================================================

export class ConnectorManager {
  private connectors: Map<string, BaseConnector> = new Map();

  /**
   * Register a connector
   */
  register(name: string, connector: BaseConnector): void {
    this.connectors.set(name, connector);
  }

  /**
   * Get a connector by name
   */
  get<T extends BaseConnector>(name: string): T | undefined {
    return this.connectors.get(name) as T | undefined;
  }

  /**
   * Connect all registered connectors
   */
  async connectAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const [name, connector] of this.connectors) {
      try {
        const connected = await connector.connect();
        results.set(name, connected);
      } catch {
        results.set(name, false);
      }
    }
    return results;
  }

  /**
   * Disconnect all connectors
   */
  async disconnectAll(): Promise<void> {
    for (const connector of this.connectors.values()) {
      await connector.disconnect();
    }
  }

  /**
   * Health check all connectors
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const [name, connector] of this.connectors) {
      const healthy = await connector.healthCheck();
      results.set(name, healthy);
    }
    return results;
  }
}

export default ConnectorManager;
