// server/src/security/soc/playbooks.ts

import { randomUUID } from 'crypto';
import { IncidentCandidate, Recommendation } from './models';
import { socStore } from './store';

export interface Playbook {
  id: string;
  name: string;
  description: string;
  preconditions: (candidate: IncidentCandidate) => boolean;
  content: {
    steps: { title: string; description: string }[];
    prerequisites: string[];
    expectedOutcomes: string[];
    verificationSteps: string[];
    rollbackPlan: string[];
  };
}

const playbookCatalog: Playbook[] = [
  {
    id: 'pb-001',
    name: 'Tighten Tool Allowlist',
    description: 'Restricts the tools an agent can use.',
    preconditions: (candidate) =>
      candidate.rationale?.correlationKey === 'actor.id' &&
      candidate.severity >= 'medium',
    content: {
      steps: [
        {
          title: 'Identify High-Risk Tools',
          description: 'Analyze the events in the incident to identify the tools being used.',
        },
        {
          title: 'Update Allowlist Policy',
          description: 'Modify the agent\'s policy to restrict access to the identified tools.',
        },
      ],
      prerequisites: ['Admin access to the policy management system.'],
      expectedOutcomes: ['The agent can no longer use the high-risk tools.'],
      verificationSteps: ['Attempt to use the restricted tools as the agent.'],
      rollbackPlan: ['Revert the policy change.'],
    },
  },
  {
    id: 'pb-002',
    name: 'Require Strict Attribution',
    description: 'Enforces stricter identity and provenance requirements for an agent.',
    preconditions: (candidate) =>
      candidate.summary.includes('attribution'),
    content: {
      steps: [
        {
          title: 'Enable Strict Attribution Mode',
          description: 'Update the agent\'s configuration to require signed commits and detailed provenance.',
        },
      ],
      prerequisites: ['Admin access to the agent configuration.'],
      expectedOutcomes: ['The agent\'s actions will have a stronger audit trail.'],
      verificationSteps: ['Check the provenance logs for a recent action by the agent.'],
      rollbackPlan: ['Disable strict attribution mode.'],
    },
  },
];

export class PlaybookRegistry {
  /**
   * Generates recommendations for an IncidentCandidate.
   * @param candidate - The IncidentCandidate to generate recommendations for.
   */
  public generateRecommendations(candidate: IncidentCandidate): void {
    for (const playbook of playbookCatalog) {
      if (playbook.preconditions(candidate)) {
        this.createRecommendation(candidate, playbook);
      }
    }
  }

  private createRecommendation(candidate: IncidentCandidate, playbook: Playbook): void {
    const recommendation: Recommendation = {
      id: randomUUID(),
      incidentId: candidate.id,
      type: 'remediation_playbook',
      content: playbook.content,
      confidence: 0.8, // Static confidence for now
      riskRating: 'medium', // Static risk rating for now
      provenance: {
        evidenceRefs: candidate.evidenceRefs,
      },
      status: 'proposed',
    };
    socStore.addRecommendation(recommendation);
  }
}
