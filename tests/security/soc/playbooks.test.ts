// tests/security/soc/playbooks.test.ts

import { PlaybookRegistry } from '../../../server/src/security/soc/playbooks';
import { socStore } from '../../../server/src/security/soc/store';
import { IncidentCandidate, Recommendation } from '../../../server/src/security/soc/models';

describe('PlaybookRegistry', () => {
  let registry: PlaybookRegistry;

  beforeEach(() => {
    // Clear the store before each test to ensure isolation
    (socStore as any).recommendations = new Map<string, Recommendation>();
    registry = new PlaybookRegistry();
  });

  it('should recommend the "Tighten Tool Allowlist" playbook for a medium-severity, actor-correlated incident', () => {
    const candidate: IncidentCandidate = {
      id: 'incident-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      severity: 'medium',
      status: 'new',
      summary: 'Multiple failed actions by actor user-2',
      evidenceRefs: ['decision-3', 'decision-4'],
      entityRefs: ['user-2'],
      rationale: { correlationKey: 'actor.id', actorId: 'user-2' },
    };

    registry.generateRecommendations(candidate);

    const recommendations = socStore.listRecommendationsForIncident('incident-1');
    expect(recommendations.length).toBe(1);
    const recommendation = recommendations[0];
    expect(recommendation.content.steps[0].title).toBe('Identify High-Risk Tools');
  });

  it('should recommend the "Require Strict Attribution" playbook for an attribution-related incident', () => {
    const candidate: IncidentCandidate = {
      id: 'incident-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      severity: 'low',
      status: 'new',
      summary: 'Missing attribution for agent action',
      evidenceRefs: ['decision-5'],
      entityRefs: ['agent-xyz'],
      rationale: { correlationKey: 'missing_attribution' },
    };

    registry.generateRecommendations(candidate);

    const recommendations = socStore.listRecommendationsForIncident('incident-2');
    expect(recommendations.length).toBe(1);
    const recommendation = recommendations[0];
    expect(recommendation.content.steps[0].title).toBe('Enable Strict Attribution Mode');
  });

  it('should not recommend any playbooks if no preconditions are met', () => {
    const candidate: IncidentCandidate = {
      id: 'incident-3',
      createdAt: new Date(),
      updatedAt: new Date(),
      severity: 'low',
      status: 'new',
      summary: 'A summary that does not trigger any playbooks',
      evidenceRefs: ['decision-6'],
      entityRefs: ['user-4'],
      rationale: {},
    };

    registry.generateRecommendations(candidate);

    const recommendations = socStore.listRecommendationsForIncident('incident-3');
    expect(recommendations.length).toBe(0);
  });
});
