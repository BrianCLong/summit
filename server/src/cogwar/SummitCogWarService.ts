
import { CogSwarmAgent } from './agents/CogSwarmAgent.js';
import { MindShieldService } from './defenses/MindShieldService.js';
import { CognitionLegionSimulator } from './simulations/CognitionLegionSimulator.js';
import { NeuroEthicsGuard } from './ethics/NeuroEthicsGuard.js';
import logger from '../utils/logger.js';

export class SummitCogWarService {
  private static instance: SummitCogWarService;

  public redTeam: CogSwarmAgent;
  public blueTeam: MindShieldService;
  public simulator: CognitionLegionSimulator;
  public ethics: NeuroEthicsGuard;

  private constructor() {
    this.redTeam = new CogSwarmAgent();
    this.blueTeam = new MindShieldService();
    this.simulator = new CognitionLegionSimulator();
    this.ethics = new NeuroEthicsGuard();
  }

  public static getInstance(): SummitCogWarService {
    if (!SummitCogWarService.instance) {
      SummitCogWarService.instance = new SummitCogWarService();
    }
    return SummitCogWarService.instance;
  }

  public async launchOperation(type: 'RED' | 'BLUE', params: any) {
    logger.info(`Launching CogWar operation: ${type}`);

    if (!this.ethics.auditOperation(type, params)) {
      throw new Error('Operation blocked by Neuro-Ethics Guard.');
    }

    if (type === 'RED') {
      const { target, topic } = params;
      return this.redTeam.craftMemeplex(target, topic);
    } else {
      const { narrativeId, content } = params;
      return this.blueTeam.deployMemeticVaccine(narrativeId, content);
    }
  }

  public async runSimulation(narrativeId: string) {
    return this.simulator.simulateNarrativeSpread(narrativeId, []);
  }
}

export default SummitCogWarService.getInstance();
