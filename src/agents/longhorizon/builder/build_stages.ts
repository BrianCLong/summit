// src/agents/longhorizon/builder/build_stages.ts
import { PRChainRecord, computeEvidenceId } from '../schema/pr_chain';

export interface TaskStage {
  id: string;
  title: string;
  objective: string;
  context: {
    pr_index: number;
    commit_shas: string[];
    is_bugfix: boolean;
  };
}

export interface StagedTask {
  evidence_id: string;
  overall_objective: string;
  stages: TaskStage[];
}

export function buildStagesFromChain(record: PRChainRecord): StagedTask {
  const evidence_id = record.evidence_id || computeEvidenceId(record);
  const stages: TaskStage[] = [];

  record.prs.forEach((pr, prIndex) => {
    stages.push({
      id: `${evidence_id}-stage-${prIndex + 1}`,
      title: pr.title,
      objective: record.objective,
      context: {
        pr_index: prIndex,
        commit_shas: pr.commits.map(c => c.sha),
        is_bugfix: !!pr.bugfix,
      },
    });
  });

  return {
    evidence_id,
    overall_objective: record.objective,
    stages,
  };
}
