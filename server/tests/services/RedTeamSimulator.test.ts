import { RedTeamSimulator } from '../../src/services/RedTeamSimulator';
import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { describe, it, expect, jest, afterEach } from '@jest/globals';

const require = createRequire(import.meta.url);
const eventBus = require('../../src/workers/eventBus.js') as EventEmitter;

describe('RedTeamSimulator', () => {
  // Clear listeners after each test to avoid interference
  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it('should inject a phishing campaign and emit an event', (done) => {
    const simulator = new RedTeamSimulator();

    eventBus.once('raw-event', (event: any) => {
      try {
        expect(event.source).toBe('red-team');
        expect(event.data.type).toBe('phishing');
        expect(event.data.entity).toBe('CorpX');
        done();
      } catch (e) {
        done(e);
      }
    });

    simulator.inject('phishing-campaign');
  });

  it('should run an influence simulation and emit results', (done) => {
    const simulator = new RedTeamSimulator();
    const config = {
      nodes: [
        { id: 'A', susceptibility: 1.0 },
        { id: 'B', susceptibility: 1.0 }
      ],
      edges: [
        { source: 'A', target: 'B', weight: 1.0 }
      ],
      seeds: ['A'],
      steps: 2,
      baseVirality: 1.0
    };

    eventBus.once('raw-event', (event: any) => {
      try {
        expect(event.source).toBe('red-team');
        expect(event.type).toBe('simulation_result');
        expect(event.data.totalSteps).toBeGreaterThan(0);
        expect(event.data.finalInfectionRate).toBeGreaterThan(0);
        done();
      } catch (e) {
        done(e);
      }
    });

    simulator.inject('influence-simulation', config);
  });
});
