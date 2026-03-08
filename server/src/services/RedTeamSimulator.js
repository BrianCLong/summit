"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedTeamSimulator = void 0;
const events_1 = require("events");
const event_bus_js_1 = require("../lib/events/event-bus.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class RedTeamSimulator extends events_1.EventEmitter {
    simulationEngine;
    activeCampaigns = new Map(); // campaignId -> simulationId
    constructor(simulationEngine) {
        super();
        this.simulationEngine = simulationEngine;
        this.initializeListeners();
    }
    initializeListeners() {
        this.simulationEngine.on('simulationCompleted', (simulation) => {
            this.handleSimulationUpdate(simulation, 'COMPLETED');
        });
        this.simulationEngine.on('simulationFailed', (simulation) => {
            this.handleSimulationUpdate(simulation, 'FAILED');
        });
    }
    handleSimulationUpdate(simulation, status) {
        // Standard event
        const eventPayload = {
            simulationId: simulation.id,
            status,
            results: simulation.results,
            timestamp: new Date()
        };
        event_bus_js_1.eventBus.emit('red-team:campaign-update', { ...eventPayload, tags: ['simulate-only'] });
        // Legacy event for backward compatibility
        event_bus_js_1.eventBus.emit('raw-event', {
            source: 'red-team',
            data: {
                type: 'campaign-update',
                ...eventPayload
            }
        });
        logger_js_1.default.info(`Red Team Campaign update: ${simulation.id} is ${status}`);
    }
    /**
     * Run a specific Red Team campaign
     */
    async runCampaign(type, targetId, options = {}) {
        logger_js_1.default.info(`Starting Red Team campaign: ${type} targeting ${targetId}`);
        const config = this.buildSimulationConfig(type, targetId, options);
        try {
            const result = await this.simulationEngine.runSimulation(config);
            const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            this.activeCampaigns.set(campaignId, result.id);
            // Standard event
            event_bus_js_1.eventBus.emit('red-team:campaign-started', {
                campaignId,
                simulationId: result.id,
                type,
                targetId,
                timestamp: new Date(),
                tags: ['simulate-only']
            });
            // Legacy event for backward compatibility
            // The original RedTeamSimulator emitted 'raw-event' with source 'red-team'
            event_bus_js_1.eventBus.emit('raw-event', {
                source: 'red-team',
                data: {
                    type,
                    entity: targetId,
                    campaignId,
                    simulationId: result.id
                }
            });
            return { campaignId, simulationId: result.id };
        }
        catch (error) {
            logger_js_1.default.error(`Failed to start Red Team campaign: ${error.message}`);
            throw error;
        }
    }
    /**
     * @deprecated Use runCampaign instead
     */
    inject(name) {
        logger_js_1.default.warn('RedTeamSimulator.inject is deprecated. Use runCampaign instead.');
        if (name === 'phishing-campaign') {
            // Best effort mapping for backward compatibility
            this.runCampaign('PHISHING_CAMPAIGN', 'legacy-target').catch(err => logger_js_1.default.error('Legacy inject failed', err));
            return { type: 'phishing', legacy: true };
        }
        throw new Error(`Unknown scenario: ${name}`);
    }
    /**
     * Maps high-level campaign types to low-level simulation engine configurations
     */
    buildSimulationConfig(type, targetId, options) {
        const baseConfig = {
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
    getCampaignStatus(campaignId) {
        const simId = this.activeCampaigns.get(campaignId);
        if (!simId)
            return null;
        return this.simulationEngine.getSimulationStatus(simId);
    }
}
exports.RedTeamSimulator = RedTeamSimulator;
// Default export for ESM
exports.default = RedTeamSimulator;
