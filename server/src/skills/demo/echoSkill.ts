import { z } from 'zod';
import type { Skill, SkillContext, SkillResult, SkillSpec } from '../abi.js';
import { buildProvenanceRecord, recordSkillProvenance } from '../provenance.js';

export const echoSkillSpec: SkillSpec<{ message: string }, { echoed: string }> = {
  id: 'skill.echo_provenance',
  version: '1.0.0',
  description: 'Echoes a message and emits provenance, artifacts, and citations.',
  inputsSchema: z.object({
    message: z.string(),
  }),
  outputsSchema: z.object({
    echoed: z.string(),
  }),
  requiredCapabilities: ['echo'],
  policyTags: ['skills-demo'],
};

export const echoSkill: Skill<{ message: string }, { echoed: string }> = {
  async run(input: { message: string }, ctx: SkillContext): Promise<SkillResult<{ echoed: string }>> {
    const started = performance.now();
    const echoed = input.message;
    const artifact = {
      id: `artifact-${ctx.requestId}`,
      uri: `memory://echo/${Date.now()}`,
      description: 'Echo output artifact',
    };
    const citation = {
      id: `citation-${ctx.requestId}`,
      uri: `memory://citation/${Date.now()}`,
      note: 'Demonstration citation reference',
    };

    const provenance = buildProvenanceRecord(
      echoSkillSpec.id,
      ctx,
      `Echoed message: ${echoed}`,
    );
    recordSkillProvenance(provenance);

    return {
      status: 'success',
      termination: {
        reason: 'completed',
        when: new Date().toISOString(),
      },
      artifacts: [artifact],
      citations: [citation],
      stateDelta: {
        lastEcho: echoed,
      },
      metrics: {
        steps: 1,
        toolCalls: 0,
        durationMs: performance.now() - started,
      },
      output: {
        echoed,
      },
    };
  },
};
