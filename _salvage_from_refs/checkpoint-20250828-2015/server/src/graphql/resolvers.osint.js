// Minimal OSINT resolvers for MVP-1
const { v4: uuid } = require('uuid');
const { pubsub } = require('./subscriptions');
const { getIO } = require('../realtime/socket');

/** @type {Array<{id:string,name:string,kind:string,url:string,license:{id:string,name?:string},rateLimitPerMin:number,enabled:boolean,lastRunAt?:string|null,tags:string[],licenseRule?:{allowIngest:boolean}}>} */
const sources = [];

const osintResolvers = {
  Query: {
    osintSources: (_parent, args) => {
      const { search, kind, enabled } = args || {};
      return sources.filter((s) => {
        if (typeof enabled === 'boolean' && s.enabled !== enabled) return false;
        if (kind && s.kind !== kind) return false;
        if (search) {
          const q = String(search).toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.url.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      });
    },
    osintItems: () => {
      return [];
    },
  },
  Mutation: {
    createOsintSource: (_parent, { input }) => {
      const src = {
        id: uuid(),
        name: input.name,
        kind: input.kind,
        url: input.url,
        license: { id: input.licenseId },
        rateLimitPerMin: input.rateLimitPerMin ?? 60,
        enabled: true,
        lastRunAt: null,
        tags: input.tags ?? [],
        licenseRule: { allowIngest: true },
      };
      sources.push(src);
      pubsub.publish('OSINT_EVT', {
        kind: 'SOURCE_CREATED',
        sourceId: src.id,
        message: `Source ${src.name} created`,
      });
      return src;
    },
    scheduleFetch: (_parent, { sourceId }) => {
      const source = sources.find((s) => s.id === sourceId);
      if (!source) throw new Error('Source not found');
      const taskId = `t:${Date.now()}`;
      const scheduledAt = new Date();
      const evt = { kind: 'FETCH_SCHEDULED', taskId, sourceId, message: `Fetch queued for ${source.name}` };
      pubsub.publish('OSINT_EVT', evt);
      try {
        const io = getIO && getIO();
        io && io.emit && io.emit('OSINT_EVT', evt);
      } catch (_) {}
      return {
        id: taskId,
        sourceId,
        status: 'QUEUED',
        scheduledAt,
        createdBy: 'me',
      };
    },
    reprocessOsintItem: () => {
      throw new Error('Not implemented in MVP-1');
    },
  },
  Subscription: {
    osintIngestEvents: {
      subscribe: () => pubsub.asyncIterator(['OSINT_EVT']),
      resolve: (ev) => ev.payload || ev,
    },
  },
};

module.exports = { osintResolvers };
