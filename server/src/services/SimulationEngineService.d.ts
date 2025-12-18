import { EventEmitter } from 'events';

export interface SimulationConfig {
  name?: string;
  description?: string;
  scenario?: string;
  engines?: string[];
  parameters?: Record<string, any>;
  investigationId?: string;
  userId?: string;
}

export interface SimulationResult {
  id: string;
  status: string;
  results?: any;
}

export declare class SimulationEngineService extends EventEmitter {
  constructor(neo4jDriver: any, copilotService: any, logger: any, threatFeedService?: any);

  initializeSimulationEngines(): void;
  loadScenarioTemplates(): void;

  runSimulation(config: SimulationConfig): Promise<SimulationResult>;

  getActiveSimulations(): any[];
  getSimulationStatus(simulationId: string): any;
  getAvailableEngines(): any[];
  getScenarioLibrary(): any[];

  // Method referenced in RedTeamSimulator logic
  executeNetworkPropagation(simulation: any, params: any): Promise<any>;
}
