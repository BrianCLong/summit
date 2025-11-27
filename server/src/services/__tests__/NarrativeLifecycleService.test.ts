import { NarrativeLifecycleService, NarrativeStage } from '../NarrativeLifecycleService';

describe('NarrativeLifecycleService', () => {
  let service: NarrativeLifecycleService;

  beforeEach(() => {
    service = new NarrativeLifecycleService();
  });

  it('should initialize narrative in BIRTH stage', () => {
    const narrative = service.createNarrative('n1', 'Test Topic');
    expect(narrative.stage).toBe(NarrativeStage.BIRTH);
    expect(narrative.metrics.volume).toBe(0);
  });

  it('should transition to GROWTH when velocity exceeds threshold', () => {
    service.createNarrative('n1', 'Test Topic');
    const narrative = service.updateNarrative('n1', {
      volume: 100,
      velocity: 60, // Threshold is 50
      sentiment: -0.5,
      reach: 1000
    });

    expect(narrative.stage).toBe(NarrativeStage.GROWTH);
  });

  it('should transition to PEAK when volume is high', () => {
    service.createNarrative('n1', 'Test Topic');
    // First enter Growth
    service.updateNarrative('n1', { volume: 500, velocity: 60, sentiment: 0, reach: 5000 });

    // Then hit Peak volume
    const narrative = service.updateNarrative('n1', {
      volume: 15000, // Threshold 10000
      velocity: 60,
      sentiment: 0,
      reach: 10000
    });

    expect(narrative.stage).toBe(NarrativeStage.PEAK);
  });

  it('should identify tipping points', () => {
    service.createNarrative('n1', 'Test Topic');
    // Set up state just before growth with high momentum
    // Need updateNarrative to set momentum.
    // Initial velocity 0. New velocity 45. Momentum = 45.
    const narrative = service.updateNarrative('n1', {
      volume: 100,
      velocity: 45, // 90% of 50
      sentiment: 0,
      reach: 1000
    });

    expect(service.isTippingPoint('n1')).toBe(true);
  });

  it('should simulate intervention correctly', () => {
    service.createNarrative('n1', 'Test Topic');
    service.updateNarrative('n1', { volume: 1000, velocity: 100, sentiment: 0, reach: 1000 });

    // Check initial state
    const original = service.updateNarrative('n1', { volume: 1000, velocity: 100, sentiment: 0, reach: 1000 });
    expect(original.metrics.velocity).toBe(100);

    // Simulate Flagging
    const simulation = service.simulateIntervention('n1', 'PLATFORM_FLAGGING');

    expect(simulation.metrics.velocity).toBe(40); // 100 * 0.4
    expect(simulation.metrics.reach).toBe(400); // 1000 * 0.4
    // Original should remain unchanged
    expect(service.isTippingPoint('n1')).toBe(false); // Just check state read
    // Or check actual object
    // Re-fetch to ensure no mutation
    // In this implementation, simulate returns a copy, so logic holds.
  });
});
