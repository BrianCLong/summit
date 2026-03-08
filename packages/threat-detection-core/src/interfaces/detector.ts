/**
 * Core detector interfaces
 */

import { ThreatEvent, AnomalyScore, BehaviorProfile, NetworkEvent } from '../types/events';
import { ThreatIndicator } from '../types/threats';
import { Alert } from '../types/alerts';
import { PredictionRequest, PredictionResult } from '../types/ml';

export interface IThreatDetector {
  /**
   * Analyze an event for threats
   */
  analyzeEvent(event: any): Promise<ThreatEvent | null>;

  /**
   * Analyze multiple events in batch
   */
  analyzeBatch(events: any[]): Promise<ThreatEvent[]>;

  /**
   * Get detector metadata
   */
  getMetadata(): DetectorMetadata;
}

export interface DetectorMetadata {
  id: string;
  name: string;
  version: string;
  type: 'behavioral' | 'network' | 'ml' | 'rule' | 'signature' | 'hybrid';
  description: string;
  capabilities: string[];
  performance: {
    averageProcessingTime: number; // milliseconds
    throughput: number; // events per second
    accuracy: number;
    falsePositiveRate: number;
  };
}

export interface IAnomalyDetector {
  /**
   * Detect anomalies in a data point
   */
  detectAnomaly(data: Record<string, any>): Promise<AnomalyScore>;

  /**
   * Update baseline with new data
   */
  updateBaseline(data: Record<string, any>): Promise<void>;

  /**
   * Get current baseline statistics
   */
  getBaseline(): Promise<any>;
}

export interface IBehaviorAnalyzer {
  /**
   * Analyze behavior for a specific entity
   */
  analyzeBehavior(entityId: string, event: any): Promise<AnomalyScore>;

  /**
   * Get or create behavior profile
   */
  getProfile(entityId: string): Promise<BehaviorProfile | null>;

  /**
   * Update behavior profile
   */
  updateProfile(entityId: string, event: any): Promise<void>;

  /**
   * Detect if entity is in learning phase
   */
  isLearningPhase(entityId: string): Promise<boolean>;
}

export interface INetworkThreatDetector {
  /**
   * Analyze network event for threats
   */
  analyzeNetworkEvent(event: NetworkEvent): Promise<ThreatEvent | null>;

  /**
   * Detect DDoS patterns
   */
  detectDDoS(events: NetworkEvent[]): Promise<ThreatEvent[]>;

  /**
   * Detect port scanning
   */
  detectPortScan(events: NetworkEvent[]): Promise<ThreatEvent[]>;

  /**
   * Detect data exfiltration
   */
  detectExfiltration(events: NetworkEvent[]): Promise<ThreatEvent[]>;

  /**
   * Detect C2 beaconing
   */
  detectBeaconing(events: NetworkEvent[]): Promise<ThreatEvent[]>;
}

export interface IMLThreatPredictor {
  /**
   * Predict threat using ML model
   */
  predict(request: PredictionRequest): Promise<PredictionResult>;

  /**
   * Batch predictions
   */
  predictBatch(requests: PredictionRequest[]): Promise<PredictionResult[]>;

  /**
   * Check if model needs retraining
   */
  checkModelHealth(): Promise<{
    healthy: boolean;
    driftDetected: boolean;
    accuracy: number;
    recommendRetrain: boolean;
  }>;
}

export interface ITTPDetector {
  /**
   * Detect MITRE ATT&CK TTPs in event
   */
  detectTTPs(event: any): Promise<{
    tactics: string[];
    techniques: string[];
    confidence: number;
  }>;

  /**
   * Map event to kill chain stage
   */
  mapToKillChain(event: any): Promise<{
    stage: string;
    confidence: number;
  }>;
}

export interface IDataIntegrityDetector {
  /**
   * Detect data poisoning attempts
   */
  detectPoisoning(data: any): Promise<{
    isPoisoned: boolean;
    confidence: number;
    reasons: string[];
  }>;

  /**
   * Validate data integrity
   */
  validateIntegrity(data: any): Promise<{
    valid: boolean;
    issues: string[];
  }>;

  /**
   * Detect statistical drift
   */
  detectDrift(data: any[]): Promise<{
    drifted: boolean;
    driftScore: number;
    features: Record<string, number>;
  }>;
}

export interface IAlertManager {
  /**
   * Create alert from threat event
   */
  createAlert(event: ThreatEvent): Promise<Alert>;

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Promise<Alert | null>;

  /**
   * Update alert status
   */
  updateAlertStatus(alertId: string, status: string): Promise<void>;

  /**
   * Enrich alert with threat intelligence
   */
  enrichAlert(alertId: string): Promise<void>;

  /**
   * Send alert notifications
   */
  sendNotifications(alert: Alert): Promise<void>;

  /**
   * Deduplicate alerts
   */
  deduplicateAlerts(alert: Alert): Promise<{
    isDuplicate: boolean;
    similarAlerts: string[];
  }>;
}

export interface IThreatIntelligenceService {
  /**
   * Query threat intelligence
   */
  query(query: any): Promise<ThreatIndicator[]>;

  /**
   * Enrich indicator
   */
  enrichIndicator(indicator: string, type: string): Promise<any>;

  /**
   * Check if indicator is malicious
   */
  isMalicious(indicator: string, type: string): Promise<{
    malicious: boolean;
    confidence: number;
    sources: string[];
  }>;

  /**
   * Get threat actor profile
   */
  getThreatActor(actorId: string): Promise<any>;
}

export interface IResponseOrchestrator {
  /**
   * Execute response playbook
   */
  executePlaybook(playbookId: string, context: any): Promise<{
    success: boolean;
    stepsExecuted: number;
    errors: string[];
  }>;

  /**
   * Execute single response action
   */
  executeAction(action: string, parameters: any): Promise<{
    success: boolean;
    result: any;
  }>;

  /**
   * Get available playbooks for threat category
   */
  getPlaybooks(category: string): Promise<any[]>;
}

export interface IThreatHuntingService {
  /**
   * Create threat hunt
   */
  createHunt(hunt: any): Promise<string>;

  /**
   * Execute hunt query
   */
  executeQuery(huntId: string, query: any): Promise<any>;

  /**
   * Record finding
   */
  recordFinding(huntId: string, finding: any): Promise<string>;

  /**
   * Get hunt results
   */
  getHuntResults(huntId: string): Promise<any>;
}

export interface IEventStorage {
  /**
   * Store threat event
   */
  storeEvent(event: ThreatEvent): Promise<void>;

  /**
   * Store events in batch
   */
  storeBatch(events: ThreatEvent[]): Promise<void>;

  /**
   * Query events
   */
  queryEvents(query: any): Promise<ThreatEvent[]>;

  /**
   * Get event by ID
   */
  getEvent(eventId: string): Promise<ThreatEvent | null>;

  /**
   * Get events by correlation ID
   */
  getCorrelatedEvents(correlationId: string): Promise<ThreatEvent[]>;
}

export interface IProfileStorage {
  /**
   * Store behavior profile
   */
  storeProfile(profile: BehaviorProfile): Promise<void>;

  /**
   * Get profile
   */
  getProfile(entityId: string): Promise<BehaviorProfile | null>;

  /**
   * Update profile metrics
   */
  updateProfile(entityId: string, updates: Partial<BehaviorProfile>): Promise<void>;

  /**
   * Delete profile
   */
  deleteProfile(entityId: string): Promise<void>;
}
