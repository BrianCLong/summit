import { AIInteractionEventSchema, IncidentEventSchema } from '../events/schemas';
import { generateEvidenceId } from '../utils/evidenceId';

describe('Governance Event Schemas', () => {
  it('should validate a valid AIInteractionEvent', () => {
    const validEvent = {
      eventId: 'evt-123',
      timestamp: new Date().toISOString(),
      actorId: 'user-1',
      sessionId: 'sess-abc',
      promptMetadata: {
        tokens: 100,
        redacted: false,
      },
      outputMetadata: {
        tokens: 50,
        redacted: true,
      },
      modelId: 'gpt-4',
    };
    const result = AIInteractionEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('should fail on invalid AIInteractionEvent', () => {
    const invalidEvent = {
      eventId: 'evt-123',
      // Missing timestamp
      actorId: 'user-1',
    };
    const result = AIInteractionEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should validate a valid IncidentEvent', () => {
    const validIncident = {
      eventId: 'inc-001',
      timestamp: new Date().toISOString(),
      incidentId: 'INC-2025-001',
      severity: 'HIGH',
      scope: ['agent-x'],
      containmentActions: ['quarantine'],
      status: 'CONTAINED',
    };
    const result = IncidentEventSchema.safeParse(validIncident);
    expect(result.success).toBe(true);
  });
});

describe('Evidence ID Generator', () => {
  it('should generate correct ID format', () => {
    const id = generateEvidenceId('INCIDENT', 'RUN', 'agent-123', 1);
    expect(id).toMatch(/^EVID::INCIDENT::RUN::agent-123::\d{8}::001$/);
  });
});
