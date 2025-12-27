import { persistedQueryService } from '../persisted-query-service.js';
import { exportService } from '../../services/ExportService.js';

export default {
  Mutation: {
    registerPersistedQuery: async (_: any, { id, sha256, sdl }: { id: string; sha256: string; sdl: string }, context: any) => {
      const user = context.user;
      if (!user) {
          throw new Error('Unauthorized');
      }
      // Assuming 'admin' role or similar.
      if (user.role !== 'admin' && user.sub !== 'system') throw new Error('Forbidden');

      return await persistedQueryService.register(id, sha256, sdl);
    },
    exportBundle: async (_: any, { tenantId }: { tenantId: string }, context: any) => {
      const user = context.user;
      if (!user) {
          throw new Error('Unauthorized');
      }
      if (user.role !== 'admin' && user.tenant_id !== tenantId) throw new Error('Forbidden');

      const { bundlePath } = await exportService.createBundle(tenantId, {});
      return bundlePath;
    }
  },
};
