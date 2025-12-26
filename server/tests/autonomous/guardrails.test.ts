
import { CapabilityImplementation, CapabilityType, capabilityRegistry } from '../../src/autonomous/capability_types';
import { PlanningCapability } from '../../src/autonomous/capabilities/planning';

describe('Agent Evolution Guardrails', () => {
  // Register capabilities for testing
  beforeAll(() => {
    // Clear registry if needed (mocking might be needed if registry is singleton)
    // For now, we assume fresh start or idempotent registration check
    try {
        capabilityRegistry.register(PlanningCapability);
    } catch (e) {
        // Ignore if already registered
    }
  });

  const capabilities = [PlanningCapability];

  test.each(capabilities)('Capability %p has valid semantic version', (cap) => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    expect(cap.schema.version).toMatch(semverRegex);
  });

  test.each(capabilities)('Capability %p has explicit limits defined', (cap) => {
    expect(cap.schema.limits).toBeDefined();
    expect(Object.keys(cap.schema.limits).length).toBeGreaterThan(0);
  });

  test.each(capabilities)('Capability %p has prohibited actions defined', (cap) => {
    expect(cap.schema.prohibitedActions).toBeDefined();
    expect(Array.isArray(cap.schema.prohibitedActions)).toBe(true);
  });

  test.each(capabilities)('Capability %p has valid type', (cap) => {
    expect(Object.values(CapabilityType)).toContain(cap.schema.type);
  });

  test.each(capabilities)('Capability %p has id', (cap) => {
    expect(cap.schema.id).toBeDefined();
    expect(typeof cap.schema.id).toBe('string');
  });
});
