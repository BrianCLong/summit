import { Law, ValidationResult } from './types.js';
import { randomUUID } from 'crypto';

export const EpistemicLaws: Law[] = [
  {
    id: 'EL-01',
    name: 'Evidence Attribution',
    type: 'EPISTEMIC',
    description: 'No assertion may be ingested or propagated without a cryptographic link to its origin.',
    version: '1.0.0',
    enforce: async (context) => {
      // In a real system, this would check `context.resource.provenance`
      if (!context.resource || !context.resource.provenance) {
        return {
          allowed: false,
          violations: [{
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            lawId: 'EL-01',
            reason: 'Resource lacks provenance data',
            context
          }]
        };
      }
      return { allowed: true, violations: [] };
    }
  },
  {
    id: 'EL-02',
    name: 'Authority Chain',
    type: 'EPISTEMIC',
    description: 'No decision may be executed without a verifiable chain of authority.',
    version: '1.0.0',
    enforce: async (context) => {
      if (!context.actor || !context.actor.roles || context.actor.roles.length === 0) {
        return {
          allowed: false,
          violations: [{
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            lawId: 'EL-02',
            reason: 'Actor lacks authority roles',
            context
          }]
        };
      }
      return { allowed: true, violations: [] };
    }
  }
];
