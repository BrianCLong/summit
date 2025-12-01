/**
 * Red Team Simulator
 *
 * Orchestrates simulated adversarial attacks and influence operations
 * for testing defense and resilience.
 *
 * @module RedTeamSimulator
 */

import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { SimulationService, SimulationConfig, SimulationResult } from './SimulationService.js';

// Robustly import CommonJS module in ESM environment
const require = createRequire(import.meta.url);
const eventBus = require('../workers/eventBus.js') as EventEmitter;

export interface RedTeamScenario {
  type: string;
  [key: string]: any;
}

export class RedTeamSimulator {
  private bus: EventEmitter;
  private simulationService: SimulationService;
  private scenarios: Map<string, () => RedTeamScenario>;

  constructor(options?: { scenarios?: Record<string, () => RedTeamScenario> }) {
    this.bus = eventBus;
    this.simulationService = new SimulationService();
    this.scenarios = new Map(Object.entries(options?.scenarios || {}));

    this.registerDefaultScenarios();
  }

  private registerDefaultScenarios() {
    if (!this.scenarios.has('phishing-campaign')) {
      this.scenarios.set('phishing-campaign', () => ({
        type: 'phishing',
        entity: 'CorpX',
        severity: 'medium',
        location: { lat: 0, lon: 0 },
        timestamp: new Date(),
      }));
    }

    if (!this.scenarios.has('influence-operation')) {
      this.scenarios.set('influence-operation', () => ({
        type: 'influence',
        narrative: 'Synthetic disinformation campaign',
        virality: 0.8,
        targetAudience: 'General',
        timestamp: new Date(),
      }));
    }
  }

  /**
   * Injects a scenario into the system.
   * Can trigger simple event generation or complex simulations.
   */
  public inject(name: string, params?: any): any {
    // Handle complex simulation
    if (name === 'influence-simulation') {
      return this.runInfluenceSimulation(params as SimulationConfig);
    }

    // Handle standard scenarios
    const generator = this.scenarios.get(name);
    if (!generator) {
      throw new Error(`Unknown scenario: ${name}`);
    }

    const payload = { ...generator(), ...params };

    // Emit to the event bus so detection services (like DefensivePsyOps) can see it
    this.bus.emit('raw-event', {
      source: 'red-team',
      type: payload.type,
      data: payload,
      timestamp: new Date()
    });

    return payload;
  }

  /**
   * Runs a graph-based influence simulation.
   */
  private runInfluenceSimulation(config: SimulationConfig): SimulationResult {
    // Run the simulation
    const result = this.simulationService.simulateSpread(config);

    // Emit the full result
    this.bus.emit('raw-event', {
      source: 'red-team',
      type: 'simulation_result',
      data: result,
      timestamp: new Date()
    });

    return result;
  }
}
