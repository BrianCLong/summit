import {
  CooperationArtifact,
  EvidenceLink,
  TaskSpec,
} from '@ga-graphai/common-types';

import { GenerationInput, ResourceAdapter } from '../capabilityRegistry.js';
import { GuardedGenerator } from '../promptOps.js';

export interface StrandDraft {
  strand: 'spec' | 'risks' | 'tests' | 'implementation';
  content: string;
  evidence: EvidenceLink[];
}

export interface BraidResult {
  artifact: CooperationArtifact;
  inconsistencies: string[];
  drafts: StrandDraft[];
}

const STRANDS: StrandDraft['strand'][] = [
  'spec',
  'risks',
  'tests',
  'implementation',
];

function extractDeclaredApis(specDraft: string): Set<string> {
  const matches = specDraft.match(/`([A-Za-z0-9_.-]+)`/g) ?? [];
  return new Set(matches.map((match) => match.replace(/`/g, '')));
}

function extractReferencedApis(testsDraft: string): Set<string> {
  const matches = testsDraft.match(/API:([A-Za-z0-9_.-]+)/g) ?? [];
  return new Set(matches.map((match) => match.split(':')[1] ?? ''));
}

export class SemanticBraidCoordinator {
  private readonly guard = new GuardedGenerator();

  async weave(
    task: TaskSpec,
    assignments: Map<StrandDraft['strand'], ResourceAdapter>,
  ): Promise<BraidResult> {
    const drafts: StrandDraft[] = [];
    for (const strand of STRANDS) {
      const resource = assignments.get(strand);
      if (!resource) {
        continue;
      }
      const prompt = this.buildPrompt(task, strand);
      const output = await resource.generate({
        task,
        strand,
        prompt,
      } satisfies GenerationInput);
      drafts.push({
        strand,
        content: output.content,
        evidence: output.evidence ?? [],
      });
    }
    const specDraft =
      drafts.find((draft) => draft.strand === 'spec')?.content ?? '';
    const testsDraft =
      drafts.find((draft) => draft.strand === 'tests')?.content ?? '';
    const declaredApis = extractDeclaredApis(specDraft);
    const referencedApis = extractReferencedApis(testsDraft);
    const inconsistencies: string[] = [];
    referencedApis.forEach((api) => {
      if (!declaredApis.has(api)) {
        inconsistencies.push(
          `Test references ${api} which is missing in spec strand.`,
        );
      }
    });

    const combined = drafts
      .map((draft) => `[#${draft.strand.toUpperCase()}]\n${draft.content}`)
      .join('\n\n');

    const aggregatedEvidence = drafts.flatMap((draft) => draft.evidence);

    const { artifact } = this.guard.enforce(
      'semantic-braid',
      combined,
      [],
      aggregatedEvidence,
    );

    return {
      artifact,
      inconsistencies,
      drafts,
    };
  }

  private buildPrompt(task: TaskSpec, strand: StrandDraft['strand']): string {
    switch (strand) {
      case 'spec':
        return `Draft a precise specification for task ${task.title} focusing on goal ${task.goal}. Declare APIs using backticks.`;
      case 'risks':
        return `Enumerate operational and safety risks for ${task.title}. Include mitigations referencing acceptance criteria IDs.`;
      case 'tests':
        return `Propose validation steps referencing declared APIs as API:Name. Cover acceptance criteria ${task.acceptanceCriteria
          .map((ac) => ac.id)
          .join(', ')}.`;
      case 'implementation':
      default:
        return `Outline implementation plan referencing the spec strand outputs and acceptance criteria.`;
    }
  }
}
