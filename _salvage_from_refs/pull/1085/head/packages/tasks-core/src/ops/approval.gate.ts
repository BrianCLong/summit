import { defineTask } from '@summit/maestro-sdk';

interface In { approved?: boolean; approver?: string; ticket?: string }
export default defineTask<In, { approved: boolean }> ({
  async execute(_ctx, { payload }){
    if (!payload.approved) throw new Error('Approval required');
    return { payload: { approved: true } };
  }
});
