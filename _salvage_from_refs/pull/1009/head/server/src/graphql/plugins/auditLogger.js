import { auditLogService } from '../../services/AuditLogService.js';

const auditLoggerPlugin = {
  async requestDidStart() {
    return {
      async willSendResponse(ctx) {
        const operation = ctx.operation;
        if (!operation || operation.operation !== 'mutation') {
          return;
        }
        const entity = (operation.selectionSet.selections[0] || {}).name?.value || 'unknown';
        const userId = ctx.contextValue?.user?.id || ctx.contextValue?.user?.sub || null;
        const tenantId = ctx.contextValue?.tenantId || ctx.contextValue?.user?.tenantId || null;
        await auditLogService.logEvent({
          userId,
          tenantId,
          action: operation.name?.value || entity,
          resource: 'graphql',
          details: ctx.response.body.kind === 'single' ? ctx.response.body.singleResult?.data : undefined,
        });
      },
    };
  },
};

export default auditLoggerPlugin;
