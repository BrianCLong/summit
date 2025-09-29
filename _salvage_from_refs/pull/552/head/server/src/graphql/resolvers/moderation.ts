import { v4 as uuidv4 } from 'uuid';
import { exportEvent } from '../../integrations/splunk/exporter';

const queue: any[] = [];
const history: any[] = [];

export const moderationResolvers = {
  Query: {
    quarantinedMedia: () => queue,
    reviewHistory: (_: any, { mediaId }: any) =>
      history.filter((h) => h.mediaId === mediaId),
  },
  Mutation: {
    reviewMedia: (_: any, { mediaId, decision, reason }: any, ctx: any) => {
      const actor = ctx.user?.id || 'anonymous';
      const record = {
        id: uuidv4(),
        mediaId,
        decision,
        reason,
        actor,
        at: new Date().toISOString(),
      };
      history.push(record);
      ctx.audit = { after: record };
      const idx = queue.findIndex((m) => m.id === mediaId);
      if (idx >= 0) queue.splice(idx, 1);
      exportEvent('reviewDecision', { mediaId, decision, actor });
      return record;
    },
  },
};

export default moderationResolvers;
