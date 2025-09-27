export type StepResult = {
  id: string;
  status: 'dry-run' | 'approved' | 'executed' | 'failed';
  output?: any;
  error?: string;
};

export interface Playbook {
  spec: { steps: any[] };
}

export class PlaybookEngine {
  constructor(private actions: Record<string, (params: any, ctx: any) => Promise<any>>) {}

  async run(pb: Playbook, inputs: Record<string, any>, ctx: { tenantId: string; dryRunDefault: boolean; approver?: string }) {
    const results: StepResult[] = [];
    for (const step of pb.spec.steps) {
      const dry = step.mode === 'dry-run' || ctx.dryRunDefault;
      if (step.requiresApproval && !ctx.approver) {
        results.push({ id: step.id, status: 'approved' });
        continue;
      }
      if (dry) {
        results.push({ id: step.id, status: 'dry-run' });
        continue;
      }
      const exec = this.actions[step.action];
      if (!exec) throw new Error('action_not_found');
      try {
        const out = await exec(step.params, { ...ctx, inputs });
        results.push({ id: step.id, status: 'executed', output: out });
      } catch (e: any) {
        results.push({ id: step.id, status: 'failed', error: e.message });
      }
    }
    return results;
  }
}
