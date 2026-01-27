
import { describe, it, expect } from 'vitest';
import { TippingPointDetector } from '../src/core/TippingPointDetector.js';
import { NarrativeState } from '../src/core/NarrativeState.js';
import type { Event } from '../src/core/types.js';
import { Actor } from '../src/entities/Actor.js';

describe('TippingPointDetector', () => {
  it('should detect when Rt exceeds threshold', () => {
    const detector = new TippingPointDetector();
    const state = new NarrativeState();

    // Add spreaders
    for (let i = 0; i < 20; i++) {
        state.addActor(new Actor({ id: `actor-${i}`, name: `Actor ${i}`, influence: 0.1 }));
    }

    const events: Event[] = [];
    // Generate enough events to trigger high Rt

    events.push({
      id: 'evt-1',
      type: 'post',
      actorId: 'actor-1',
      intensity: 1.0,
      timestamp: 100,
      payload: { narrativeId: 'narrative-1' }
    });

    const alerts = detector.analyze(state, events);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      narrativeId: 'narrative-1',
      type: 'BREAKOUT_WARNING',
      metric: 'rt',
    });
    expect(alerts[0].value).toBeGreaterThan(1.5);
  });

  it('should detect elite uptake', () => {
    const detector = new TippingPointDetector();
    const state = new NarrativeState();

    // Add elite actors
    for (let i = 0; i < 5; i++) {
        state.addActor(new Actor({ id: `elite-${i}`, name: `Elite ${i}`, influence: 0.9 }));
    }

    const events: Event[] = [];
    for (let i = 0; i < 3; i++) {
        events.push({
            id: `evt-${i}`,
            type: 'post',
            actorId: `elite-${i}`,
            intensity: 1.0,
            timestamp: 100,
            payload: { narrativeId: 'narrative-elite' }
        });
    }

    const alerts = detector.analyze(state, events);

    // We expect both RT and Elite Uptake warnings might be triggered
    // In our test setup, RT is high because spreaders are few (just elites)
    // 3 events / 1 active spreader * 5 = 15 Rt

    const eliteAlert = alerts.find(a => a.metric === 'eliteUptake');

    expect(eliteAlert).toBeDefined();
    expect(eliteAlert).toMatchObject({
      narrativeId: 'narrative-elite',
      type: 'BREAKOUT_WARNING',
      metric: 'eliteUptake',
      value: 3
    });
  });
});
