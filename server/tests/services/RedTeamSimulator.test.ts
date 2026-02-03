import { RedTeamSimulator } from '../../src/services/RedTeamSimulator';
import { EventEmitter } from 'events';
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { eventBus } from '../../src/lib/events/event-bus.js';

describe('RedTeamSimulator', () => {
  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it('should run a phishing campaign and emit an event', (done) => {
    const simulationEngine = new EventEmitter() as any;
    simulationEngine.runSimulation = jest.fn().mockResolvedValue({ id: 'sim-1' });
    const simulator = new RedTeamSimulator(simulationEngine);

    eventBus.once('raw-event', (event: any) => {
      try {
        expect(event.source).toBe('red-team');
        expect(event.data.type).toBe('PHISHING_CAMPAIGN');
        expect(event.data.entity).toBe('CorpX');
        done();
      } catch (e) {
        done(e as Error);
      }
    });

    simulator.runCampaign('PHISHING_CAMPAIGN', 'CorpX').catch(done);
  });

  it('should emit a completion update when a simulation finishes', (done) => {
    const simulationEngine = new EventEmitter() as any;
    simulationEngine.runSimulation = jest.fn().mockResolvedValue({ id: 'sim-2' });
    const simulator = new RedTeamSimulator(simulationEngine);

    eventBus.once('red-team:campaign-update', (event: any) => {
      try {
        expect(event.status).toBe('COMPLETED');
        expect(event.simulationId).toBe('sim-2');
        done();
      } catch (e) {
        done(e as Error);
      }
    });

    simulator.runCampaign('PHISHING_CAMPAIGN', 'CorpY').then(() => {
      simulationEngine.emit('simulationCompleted', { id: 'sim-2', results: {} });
    }).catch(done);
  });
});
