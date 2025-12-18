import { EventEmitter } from 'events';
import { SimulationEngineService, SimulationConfig } from './SimulationEngineService';
import eventBus from '../workers/eventBus';
import logger from '../utils/logger';

export interface CampaignOptions {
  name?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  parameters?: Record<string, any>;
  userId?: string;
  investigationId?: string;
}

export type CampaignType = 'PHISHING_CAMPAIGN' | 'NETWORK_BREACH' | 'INSIDER_THREAT' | 'RANSOMWARE_OUTBREAK';

export class RedTeamSimulator extends EventEmitter {
  private simulationEngine: SimulationEngineService;
  private activeCampaigns: Map<string, string> = new Map(); // campaignId -> simulationId

  constructor(simulationEngine: SimulationEngineService) {
    super();
    this.simulationEngine = simulationEngine;
    this.initializeListeners();
  }

  private initializeListeners() {
    this.simulationEngine.on('simulationCompleted', (simulation: any) => {
      this.handleSimulationUpdate(simulation, 'COMPLETED');
    });

    this.simulationEngine.on('simulationFailed', (simulation: any) => {
      this.handleSimulationUpdate(simulation, 'FAILED');
    });
  }

  private handleSimulationUpdate(simulation: any, status: string) {
    // Standard event
    const eventPayload = {
      simulationId: simulation.id,
      status,
      results: simulation.results,
      timestamp: new Date()
    };

    eventBus.emit('red-team:campaign-update', eventPayload);

    // Legacy event for backward compatibility
    eventBus.emit('raw-event', {
        source: 'red-team',
        data: {
            type: 'campaign-update',
            ...eventPayload
        }
    });

    logger.info(`Red Team Campaign update: ${simulation.id} is ${status}`);
  }

  /**
   * Run a specific Red Team campaign
   */
  async runCampaign(type: CampaignType, targetId: string, options: CampaignOptions = {}): Promise<{ campaignId: string, simulationId: string }> {
    logger.info(`Starting Red Team campaign: ${type} targeting ${targetId}`);

    const config = this.buildSimulationConfig(type, targetId, options);

    try {
      const result = await this.simulationEngine.runSimulation(config);
      const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      this.activeCampaigns.set(campaignId, result.id);

      // Standard event
      eventBus.emit('red-team:campaign-started', {
        campaignId,
        simulationId: result.id,
        type,
        targetId,
        timestamp: new Date()
      });

      // Legacy event for backward compatibility
      // The original RedTeamSimulator emitted 'raw-event' with source 'red-team'
      eventBus.emit('raw-event', {
          source: 'red-team',
          data: {
              type,
              entity: targetId,
              campaignId,
              simulationId: result.id
          }
      });

      return { campaignId, simulationId: result.id };
    } catch (error: any) {
      logger.error(`Failed to start Red Team campaign: ${error.message}`);
      throw error;
    }
  }

  /**
   * @deprecated Use runCampaign instead
   */
  inject(name: string): any {
     logger.warn('RedTeamSimulator.inject is deprecated. Use runCampaign instead.');
     if (name === 'phishing-campaign') {
         // Best effort mapping for backward compatibility
         this.runCampaign('PHISHING_CAMPAIGN', 'legacy-target').catch(err => logger.error('Legacy inject failed', err));
         return { type: 'phishing', legacy: true };
     }
     throw new Error(`Unknown scenario: ${name}`);
  }

  /**
   * Maps high-level campaign types to low-level simulation engine configurations
   */
  private buildSimulationConfig(type: CampaignType, targetId: string, options: CampaignOptions): SimulationConfig {
    const baseConfig: SimulationConfig = {
      name: options.name || `${type} against ${targetId}`,
      description: options.description || `Red Team simulation of ${type}`,
      investigationId: options.investigationId || targetId, // Assuming targetId can map to investigationId context
      userId: options.userId || 'system-red-team',
      parameters: { ...options.parameters, targetId }
    };

    switch (type) {
      case 'PHISHING_CAMPAIGN':
        return {
          ...baseConfig,
          scenario: 'SOCIO_COGNITIVE',
          engines: ['NETWORK_PROPAGATION', 'BEHAVIORAL_PREDICTION'],
          parameters: {
            ...baseConfig.parameters,
            propagationRate: 0.4, // Phishing spreads fast
            resistanceFactor: 0.3, // User awareness
            threshold: 0.1
          }
        };

      case 'NETWORK_BREACH':
        return {
          ...baseConfig,
          scenario: 'CYBER_PHYSICAL',
          engines: ['NETWORK_PROPAGATION', 'RISK_ASSESSMENT', 'EVENT_CASCADE'],
          parameters: {
            ...baseConfig.parameters,
            propagationRate: 0.6,
            decayFactor: 0.2,
            cascadeDepth: 4
          }
        };

      case 'INSIDER_THREAT':
        return {
          ...baseConfig,
          scenario: 'THREAT_PROPAGATION',
          engines: ['RISK_ASSESSMENT', 'BEHAVIORAL_PREDICTION'],
          parameters: {
            ...baseConfig.parameters,
            impactRadius: 2, // Localized impact initially
            confidenceThreshold: 0.8
          }
        };

      case 'RANSOMWARE_OUTBREAK':
        return {
          ...baseConfig,
          scenario: 'CRISIS_RESPONSE',
          engines: ['NETWORK_PROPAGATION', 'EVENT_CASCADE', 'RESOURCE_ALLOCATION'],
          parameters: {
            ...baseConfig.parameters,
            propagationRate: 0.8, // Very fast
            impactDecay: 0.05, // High impact persistence
            timeDelay: 1 // Fast cascade (1 hour)
          }
        };

      default:
        throw new Error(`Unknown campaign type: ${type}`);
    }
  }

  getCampaignStatus(campaignId: string) {
    const simId = this.activeCampaigns.get(campaignId);
    if (!simId) return null;
    return this.simulationEngine.getSimulationStatus(simId);
  }
}

// Default export for ESM
export default RedTeamSimulator;
