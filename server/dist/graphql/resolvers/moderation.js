import { v4 as uuidv4 } from 'uuid';
import { exportEvent } from '../../integrations/splunk/exporter';
const queue = [];
const history = [];
export const moderationResolvers = {
    Query: {
        quarantinedMedia: () => queue,
        reviewHistory: (_, { mediaId }) => history.filter((h) => h.mediaId === mediaId),
    },
    Mutation: {
        reviewMedia: (_, { mediaId, decision, reason }, ctx) => {
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
            if (idx >= 0)
                queue.splice(idx, 1);
            exportEvent('reviewDecision', { mediaId, decision, actor });
            return record;
        },
    },
};
export default moderationResolvers;
//# sourceMappingURL=moderation.js.map