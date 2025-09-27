import { emitLabel } from './actions.publish';
export const PredictiveFeedback = {
  Mutation: {
    acceptSuggestion: async (_:any, { id }:any, ctx:any) => {
      // ... existing accept logic ...
      await emitLabel({ tenantId: ctx.tenantId, userId: ctx.user.id, suggestionId: id, label: 'accept', ts: new Date().toISOString() });
      return { id, status: 'accepted' };
    },
    rejectSuggestion: async (_:any, { id, reason }:any, ctx:any) => {
      // ... existing reject logic ...
      await emitLabel({ tenantId: ctx.tenantId, userId: ctx.user.id, suggestionId: id, label: 'reject', context: { reason }, ts: new Date().toISOString() });
      return { id, status: 'rejected' };
    }
  }
};
