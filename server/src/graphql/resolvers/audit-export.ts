import baseLogger from '../../config/logger';
import {
  fetchAuditLogs,
  serializeAuditLogs,
  AuditLogExportFilter,
  AuditLogPaginationInput,
  AuditLogExportFormat,
} from '../../audit/export.js';

const logger = baseLogger.child({ name: 'auditExportResolvers' });

const ALLOWED_ROLES = new Set(['ADMIN', 'SECURITY', 'COMPLIANCE', 'AUDITOR']);

type ExportArgs = {
  format: AuditLogExportFormat;
  filter?: AuditLogExportFilter;
  pagination?: AuditLogPaginationInput;
};

type GraphQLContext = {
  user?: {
    id?: string;
    role?: string;
    tenantId?: string;
  };
};

function ensureAuthorized(ctx: GraphQLContext) {
  const role = ctx?.user?.role?.toUpperCase();
  if (!role || !ALLOWED_ROLES.has(role)) {
    logger.warn({ userId: ctx?.user?.id, role }, 'audit log export denied');
    throw new Error('Access denied: insufficient privileges for audit export');
  }
}

export const auditExportResolvers = {
  Query: {
    async exportAuditLogs(_parent: unknown, args: ExportArgs, ctx: GraphQLContext) {
      ensureAuthorized(ctx);
      logger.info({
        userId: ctx?.user?.id,
        role: ctx?.user?.role,
        filter: args.filter,
        pagination: args.pagination,
        format: args.format,
      }, 'exporting audit logs');

      const result = await fetchAuditLogs(args.filter, args.pagination);
      const content = serializeAuditLogs(result.records, args.format);

      return {
        format: args.format,
        content,
        records: result.records,
        pageInfo: {
          hasNextPage: result.hasNextPage,
          nextCursor: result.nextCursor,
          totalCount: result.totalCount,
          limit: result.limit,
        },
      };
    },
  },
};

export default auditExportResolvers;
