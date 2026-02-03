import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { CorrelationService } from '../CorrelationService.js';
import { AlertEvent } from '../../../types/alerts.js';

describe('CorrelationService', () => {
  let correlationService: CorrelationService;

  beforeEach(() => {
    correlationService = new CorrelationService(5000); // 5 seconds window
  });

  it('should group events by entity key', () => {
    const events: AlertEvent[] = [
      { id: '1', ruleId: 'r1', metric: 'm1', value: 10, threshold: 5, message: 'm', timestamp: 1000, entities: ['e1'], attributes: {} },
      { id: '2', ruleId: 'r2', metric: 'm2', value: 20, threshold: 5, message: 'm', timestamp: 2000, entities: ['e1'], attributes: {} },
      { id: '3', ruleId: 'r3', metric: 'm3', value: 30, threshold: 5, message: 'm', timestamp: 3000, entities: ['e2'], attributes: {} },
    ];

    const incidents = correlationService.correlate(events);

    // Should have 2 incidents: one for e1 (2 events), one for e2 (1 event)
    expect(incidents.length).toBe(2);

    const e1Incident = incidents.find(i => i.key === 'e1');
    expect(e1Incident).toBeDefined();
    expect(e1Incident!.events.length).toBe(2);
    expect(e1Incident!.severity).toBe('medium');

    const e2Incident = incidents.find(i => i.key === 'e2');
    expect(e2Incident).toBeDefined();
    expect(e2Incident!.events.length).toBe(1);
    expect(e2Incident!.severity).toBe('low');
  });

  it('should split incidents based on time window', () => {
    const events: AlertEvent[] = [
      { id: '1', ruleId: 'r1', metric: 'm1', value: 10, threshold: 5, message: 'm', timestamp: 1000, entities: ['e1'], attributes: {} },
      { id: '2', ruleId: 'r2', metric: 'm2', value: 20, threshold: 5, message: 'm', timestamp: 7000, entities: ['e1'], attributes: {} }, // 6s later
    ];

    const incidents = correlationService.correlate(events);

    // Should have 2 incidents because the second event is outside the 5s window of the first
    expect(incidents.length).toBe(2);
    expect(incidents[0].events[0].id).toBe('1');
    expect(incidents[1].events[0].id).toBe('2');
  });

  it('should promote severity based on event count', () => {
     const events: AlertEvent[] = [];
     for(let i=0; i<5; i++) {
         events.push({
             id: `${i}`,
             ruleId: 'r1',
             metric: 'm1',
             value: 10,
             threshold: 5,
             message: 'm',
             timestamp: 1000 + i*100,
             entities: ['critical-entity'],
             attributes: {}
         });
     }

     const incidents = correlationService.correlate(events);
     expect(incidents.length).toBe(1);
     expect(incidents[0].severity).toBe('critical');
  });
});
