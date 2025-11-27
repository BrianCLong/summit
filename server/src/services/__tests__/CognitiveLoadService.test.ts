import { CognitiveLoadService } from '../CognitiveLoadService';

describe('CognitiveLoadService', () => {
  let service: CognitiveLoadService;

  beforeEach(() => {
    service = new CognitiveLoadService();
  });

  it('should start with baseline susceptibility', () => {
    const state = service.getOrCreateUser('u1');
    expect(state.susceptibilityScore).toBe(0.1);
    expect(state.currentLoad).toBe(0);
  });

  it('should increase load and fatigue on exposure', () => {
    const messages = [
      { id: 'm1', complexity: 8, emotionalIntensity: 8, urgency: 5 }, // High impact
      { id: 'm2', complexity: 8, emotionalIntensity: 8, urgency: 5 }
    ];

    // Impact calculation: 8 * (1 + 0.8) = 14.4 per msg. Total ~28.8
    const state = service.simulateExposure('u1', messages);

    expect(state.currentLoad).toBeGreaterThan(20);
    expect(state.susceptibilityScore).toBeGreaterThan(0.1);
  });

  it('should cap load and spill over to fatigue', () => {
    // Generate massive load
    const messages = Array(10).fill({ id: 'm', complexity: 10, emotionalIntensity: 10, urgency: 10 });
    // 10 * (10 * 2) = 200 load.

    const state = service.simulateExposure('u1', messages);

    expect(state.currentLoad).toBe(100); // Capped
    expect(state.fatigueLevel).toBeGreaterThan(0); // Spilled over
    expect(state.susceptibilityScore).toBeGreaterThan(0.5); // Significant increase
  });

  it('should recover with strategies', () => {
    const messages = Array(5).fill({ id: 'm', complexity: 10, emotionalIntensity: 5, urgency: 5 });
    service.simulateExposure('u1', messages);

    const before = service.getOrCreateUser('u1').susceptibilityScore;

    service.applyResilienceStrategy('u1', 'DIGITAL_DETOX');

    const after = service.getOrCreateUser('u1').susceptibilityScore;
    expect(after).toBeLessThan(before);
  });

  it('should recover over time (tick)', () => {
    service.simulateExposure('u1', [{ id: 'm', complexity: 10, emotionalIntensity: 0, urgency: 0 }]);
    const initialLoad = service.getOrCreateUser('u1').currentLoad;

    service.tick('u1');

    const finalLoad = service.getOrCreateUser('u1').currentLoad;
    expect(finalLoad).toBeLessThan(initialLoad);
  });
});
