// Offline Kit: Local subset of services for disconnected operations
// Enables edge deployments with minimal dependencies and eventual consistency

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { z } from 'zod';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';
import { crdtSyncEngine } from './crdt-sync.js';
import { verifiableSyncLog } from './verifiable-sync-log.js';
import { claimSyncEngine } from './claim-sync.js';
import { policyLeakSimulator } from './policy-leak-simulator.js';

// Service capability definitions
export interface ServiceCapability {
  serviceId: string;
  serviceName: string;
  minimalMode: boolean; // Can run in minimal offline mode?
  dependencies: string[]; // Required service dependencies
  dataSubset: string[]; // Entity types this service operates on
  offlineStorage: 'memory' | 'redis' | 'sqlite' | 'none';
  syncStrategy: 'full' | 'claims_only' | 'none';
}

// Offline kit configuration
const OfflineKitConfigSchema = z.object({
  nodeId: z.string(),
  nodeType: z.enum(['cloud', 'edge', 'mobile', 'airgap']),
  offlineMode: z.boolean().default(false),
  autoDetectConnectivity: z.boolean().default(true),
  services: z.array(z.string()).default([
    'investigation',
    'analysis',
    'search-local',
    'workflow-minimal',
  ]),
  storage: z.object({
    primary: z.enum(['memory', 'redis', 'sqlite']).default('redis'),
    maxSize: z.number().default(1024 * 1024 * 100), // 100MB default
    ttl: z.number().default(86400 * 30), // 30 days
  }),
  sync: z.object({
    enabled: z.boolean().default(true),
    strategy: z.enum(['full', 'claims_only', 'hybrid']).default('claims_only'),
    verifiable: z.boolean().default(true),
    batchSize: z.number().default(100),
    retryAttempts: z.number().default(3),
  }),
  security: z.object({
    requireProofs: z.boolean().default(true),
    policySimulation: z.boolean().default(true),
    leakageDetection: z.boolean().default(true),
    airgapMode: z.boolean().default(false),
  }),
});

type OfflineKitConfig = z.infer<typeof OfflineKitConfigSchema>;

// Service registry for offline capabilities
const SERVICE_REGISTRY: Record<string, ServiceCapability> = {
  investigation: {
    serviceId: 'investigation',
    serviceName: 'Investigation Service',
    minimalMode: true,
    dependencies: ['storage', 'search-local'],
    dataSubset: ['investigation', 'evidence', 'findings'],
    offlineStorage: 'redis',
    syncStrategy: 'claims_only',
  },
  analysis: {
    serviceId: 'analysis',
    serviceName: 'Analysis Service',
    minimalMode: true,
    dependencies: ['storage'],
    dataSubset: ['analysis_result', 'ml_inference'],
    offlineStorage: 'redis',
    syncStrategy: 'claims_only',
  },
  'search-local': {
    serviceId: 'search-local',
    serviceName: 'Local Search',
    minimalMode: true,
    dependencies: ['storage'],
    dataSubset: ['entity', 'relationship'],
    offlineStorage: 'memory',
    syncStrategy: 'none',
  },
  'workflow-minimal': {
    serviceId: 'workflow-minimal',
    serviceName: 'Minimal Workflow Engine',
    minimalMode: true,
    dependencies: ['storage'],
    dataSubset: ['workflow', 'step'],
    offlineStorage: 'redis',
    syncStrategy: 'full',
  },
};

// Connectivity status
export interface ConnectivityStatus {
  online: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
  totalOnlineTime: number; // milliseconds
  totalOfflineTime: number; // milliseconds
  reconnectAttempts: number;
  lastSyncTime: Date | null;
  pendingOperations: number;
}

// Offline session metadata
export interface OfflineSession {
  sessionId: string;
  nodeId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // milliseconds
  operationCount: number;
  entityTypes: string[];
  claimsGenerated: number;
  proofsGenerated: number;
  syncCompleted: boolean;
  policyViolations: string[];
  leakageDetected: boolean;
}

/**
 * Offline Kit - Manages local service subset and offline-first operations
 */
export class OfflineKit extends EventEmitter {
  private config: OfflineKitConfig;
  private redis: Redis;
  private connectivity: ConnectivityStatus;
  private currentSession: OfflineSession | null = null;
  private enabledServices: Set<string>;
  private connectivityCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<OfflineKitConfig>) {
    super();
    this.config = OfflineKitConfigSchema.parse(config);

    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      retryStrategy: (times) => {
        // Exponential backoff, max 30 seconds
        return Math.min(times * 1000, 30000);
      },
    });

    this.connectivity = {
      online: false,
      lastOnline: null,
      lastOffline: null,
      totalOnlineTime: 0,
      totalOfflineTime: 0,
      reconnectAttempts: 0,
      lastSyncTime: null,
      pendingOperations: 0,
    };

    this.enabledServices = new Set(this.config.services);

    logger.info('Offline Kit initialized', {
      nodeId: this.config.nodeId,
      nodeType: this.config.nodeType,
      services: Array.from(this.enabledServices),
    });
  }

  /**
   * Initialize offline kit and start services
   */
  async initialize(): Promise<void> {
    try {
      // Connect to Redis (with retry logic)
      await this.redis.connect();

      // Check initial connectivity
      await this.checkConnectivity();

      // Start session
      await this.startOfflineSession();

      // Setup connectivity monitoring
      if (this.config.autoDetectConnectivity) {
        this.startConnectivityMonitoring();
      }

      // Initialize enabled services
      await this.initializeServices();

      // Register with CRDT sync engine
      await this.registerWithCRDT();

      logger.info('Offline Kit ready', {
        nodeId: this.config.nodeId,
        online: this.connectivity.online,
        services: Array.from(this.enabledServices),
      });

      this.emit('initialized', { online: this.connectivity.online });
    } catch (error) {
      logger.error('Offline Kit initialization failed', { error });
      throw error;
    }
  }

  /**
   * Check network connectivity
   */
  private async checkConnectivity(): Promise<boolean> {
    const wasOnline = this.connectivity.online;

    try {
      // Try to ping a known endpoint
      const cloudUrl = process.env.CLOUD_ENDPOINT || 'http://localhost:4000';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${cloudUrl}/health`, {
        signal: controller.signal,
        headers: { 'User-Agent': `offline-kit/${this.config.nodeId}` },
      });

      clearTimeout(timeout);
      this.connectivity.online = response.ok;
    } catch (error) {
      this.connectivity.online = false;
    }

    // Handle state transitions
    if (wasOnline && !this.connectivity.online) {
      // Went offline
      this.connectivity.lastOffline = new Date();
      await this.handleOfflineTransition();
      this.emit('offline', { timestamp: this.connectivity.lastOffline });
    } else if (!wasOnline && this.connectivity.online) {
      // Came online
      this.connectivity.lastOnline = new Date();
      this.connectivity.reconnectAttempts++;
      await this.handleOnlineTransition();
      this.emit('online', { timestamp: this.connectivity.lastOnline });
    }

    return this.connectivity.online;
  }

  /**
   * Start periodic connectivity monitoring
   */
  private startConnectivityMonitoring(): void {
    const interval = this.config.nodeType === 'mobile' ? 30000 : 60000; // 30s for mobile, 60s otherwise

    this.connectivityCheckInterval = setInterval(async () => {
      await this.checkConnectivity();
    }, interval);
  }

  /**
   * Handle transition to offline mode
   */
  private async handleOfflineTransition(): Promise<void> {
    logger.warn('Entering offline mode', { nodeId: this.config.nodeId });

    // Enable offline-only services
    this.config.offlineMode = true;

    // Pause non-critical sync operations
    await this.pauseBackgroundSync();

    // Start new offline session
    await this.startOfflineSession();

    prometheusConductorMetrics.recordOperationalEvent(
      'offline_kit_went_offline',
      true,
    );
  }

  /**
   * Handle transition to online mode
   */
  private async handleOnlineTransition(): Promise<void> {
    logger.info('Reconnecting to online mode', { nodeId: this.config.nodeId });

    this.config.offlineMode = false;

    // End current offline session
    await this.endOfflineSession();

    // Attempt sync
    await this.syncWithCloud();

    prometheusConductorMetrics.recordOperationalEvent(
      'offline_kit_reconnected',
      true,
    );
  }

  /**
   * Start offline session tracking
   */
  private async startOfflineSession(): Promise<void> {
    if (this.currentSession) {
      // End existing session first
      await this.endOfflineSession();
    }

    this.currentSession = {
      sessionId: `session_${this.config.nodeId}_${Date.now()}`,
      nodeId: this.config.nodeId,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      operationCount: 0,
      entityTypes: [],
      claimsGenerated: 0,
      proofsGenerated: 0,
      syncCompleted: false,
      policyViolations: [],
      leakageDetected: false,
    };

    await this.redis.set(
      `offline_session:${this.currentSession.sessionId}`,
      JSON.stringify(this.currentSession),
      'EX',
      86400 * 7, // 7 days
    );

    logger.info('Offline session started', {
      sessionId: this.currentSession.sessionId,
    });
  }

  /**
   * End offline session and prepare for sync
   */
  private async endOfflineSession(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = new Date();
    this.currentSession.duration =
      this.currentSession.endTime.getTime() -
      this.currentSession.startTime.getTime();

    // Get pending operations count
    this.currentSession.operationCount = await this.getPendingOperationsCount();

    // Persist final session state
    await this.redis.set(
      `offline_session:${this.currentSession.sessionId}`,
      JSON.stringify(this.currentSession),
      'EX',
      86400 * 30, // Keep for 30 days
    );

    logger.info('Offline session ended', {
      sessionId: this.currentSession.sessionId,
      duration: this.currentSession.duration,
      operations: this.currentSession.operationCount,
    });

    this.currentSession = null;
  }

  /**
   * Initialize enabled services
   */
  private async initializeServices(): Promise<void> {
    for (const serviceId of this.enabledServices) {
      const service = SERVICE_REGISTRY[serviceId];
      if (!service) {
        logger.warn(`Unknown service: ${serviceId}`);
        continue;
      }

      // Check dependencies
      const missingDeps = service.dependencies.filter(
        (dep) => !this.enabledServices.has(dep) && dep !== 'storage',
      );

      if (missingDeps.length > 0) {
        logger.error(`Service ${serviceId} missing dependencies`, {
          missing: missingDeps,
        });
        this.enabledServices.delete(serviceId);
        continue;
      }

      logger.info(`Service enabled: ${service.serviceName}`);
    }
  }

  /**
   * Register with CRDT sync engine
   */
  private async registerWithCRDT(): Promise<void> {
    const syncPriority = {
      cloud: 100,
      edge: 80,
      mobile: 60,
      airgap: 50,
    }[this.config.nodeType];

    await crdtSyncEngine.registerNode({
      nodeId: this.config.nodeId,
      instanceId: process.env.INSTANCE_ID || this.config.nodeId,
      location: this.config.nodeType,
      version: process.env.VERSION || '1.0.0',
      capabilities: Array.from(this.enabledServices),
      syncPriority,
    });
  }

  /**
   * Pause background sync operations
   */
  private async pauseBackgroundSync(): Promise<void> {
    // Mark sync as paused in Redis
    await this.redis.set(
      `sync_paused:${this.config.nodeId}`,
      'true',
      'EX',
      3600,
    );
  }

  /**
   * Get count of pending sync operations
   */
  private async getPendingOperationsCount(): Promise<number> {
    const count = await this.redis.zcard(`crdt_log:${this.config.nodeId}`);
    return count || 0;
  }

  /**
   * Sync with cloud when reconnected
   */
  async syncWithCloud(): Promise<{
    success: boolean;
    operationsSent: number;
    claimsSent: number;
    conflicts: number;
    leakageDetected: boolean;
  }> {
    if (!this.connectivity.online) {
      throw new Error('Cannot sync while offline');
    }

    logger.info('Starting cloud sync', { nodeId: this.config.nodeId });

    try {
      const result = {
        success: false,
        operationsSent: 0,
        claimsSent: 0,
        conflicts: 0,
        leakageDetected: false,
      };

      // Step 1: Policy simulation - check for leakage BEFORE sync
      if (this.config.security.policySimulation) {
        logger.info('Running policy simulation for leakage detection');
        const simulation = await policyLeakSimulator.simulateSync(
          this.config.nodeId,
          'cloud-primary',
        );

        result.leakageDetected = simulation.leakageDetected;

        if (simulation.leakageDetected) {
          logger.error('Policy leakage detected during simulation', {
            violations: simulation.violations,
          });

          // Record but don't block sync - violations will be filtered
          prometheusConductorMetrics.recordOperationalEvent(
            'sync_leakage_detected',
            true,
          );
        }
      }

      // Step 2: Get verifiable sync log
      const pendingOps = await this.getPendingOperationsCount();
      logger.info(`Syncing ${pendingOps} pending operations`);

      // Step 3: Convert to claims if using claims-only strategy
      if (this.config.sync.strategy === 'claims_only') {
        logger.info('Converting operations to claims');
        const claimResult = await claimSyncEngine.convertAndSync(
          this.config.nodeId,
          'cloud-primary',
        );

        result.claimsSent = claimResult.claimsSent;
        result.conflicts = claimResult.conflicts.length;
      } else {
        // Full sync with CRDT engine
        const syncResponse = await crdtSyncEngine.syncWithNode('cloud-primary');
        result.operationsSent = syncResponse.operations.length;
        result.conflicts = syncResponse.conflictsDetected.length;
      }

      // Step 4: Update connectivity status
      this.connectivity.lastSyncTime = new Date();
      this.connectivity.pendingOperations = await this.getPendingOperationsCount();

      result.success = true;

      logger.info('Cloud sync completed', result);

      prometheusConductorMetrics.recordOperationalMetric(
        'offline_kit_sync_operations',
        result.operationsSent + result.claimsSent,
      );

      this.emit('sync_completed', result);

      return result;
    } catch (error) {
      logger.error('Cloud sync failed', { error });
      prometheusConductorMetrics.recordOperationalEvent(
        'offline_kit_sync_failed',
        false,
      );
      throw error;
    }
  }

  /**
   * Get current kit status
   */
  getStatus(): {
    nodeId: string;
    nodeType: string;
    online: boolean;
    services: string[];
    connectivity: ConnectivityStatus;
    currentSession: OfflineSession | null;
  } {
    return {
      nodeId: this.config.nodeId,
      nodeType: this.config.nodeType,
      online: this.connectivity.online,
      services: Array.from(this.enabledServices),
      connectivity: this.connectivity,
      currentSession: this.currentSession,
    };
  }

  /**
   * Get service capabilities
   */
  getServiceCapabilities(serviceId: string): ServiceCapability | null {
    return SERVICE_REGISTRY[serviceId] || null;
  }

  /**
   * Check if service is available offline
   */
  isServiceAvailable(serviceId: string): boolean {
    return this.enabledServices.has(serviceId);
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Offline Kit', { nodeId: this.config.nodeId });

    if (this.connectivityCheckInterval) {
      clearInterval(this.connectivityCheckInterval);
    }

    await this.endOfflineSession();
    await this.redis.quit();

    this.emit('shutdown');
  }
}

// Export singleton instance
const nodeId =
  process.env.OFFLINE_KIT_NODE_ID ||
  `edge-${Math.random().toString(36).substring(7)}`;
const nodeType = (process.env.NODE_TYPE as any) || 'edge';

export const offlineKit = new OfflineKit({
  nodeId,
  nodeType,
});
