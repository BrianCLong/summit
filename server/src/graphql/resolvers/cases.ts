import { CaseService } from '../../cases/CaseService.js';
import { getPostgresPool } from '../../db/postgres.js';
import { authGuard } from '../utils/auth.js';
import { GraphQLContext } from '../apollo-v5-server.js';
import { LegalBasis } from '../../repos/AuditAccessLogRepo.js';

const pg = getPostgresPool();
const caseService = new CaseService(pg);

export const caseResolvers = {
  Query: {
    case: authGuard(async (
      _: any,
      { id, reason, legalBasis }: { id: string; reason: string; legalBasis: LegalBasis },
      context: GraphQLContext
    ) => {
      const tenantId = context.user!.tenantId;
      const userId = context.user!.id;
      return caseService.getCase(id, tenantId, userId, { reason, legalBasis });
    }),
    cases: authGuard(async (
      _: any,
      { status, compartment, limit, offset }: { status?: string; compartment?: string; limit?: number; offset?: number },
      context: GraphQLContext
    ) => {
      const tenantId = context.user!.tenantId;
      return caseService.listCases({ tenantId, status, compartment, limit, offset });
    }),
  },
  Mutation: {
    createCase: authGuard(async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      const tenantId = context.user!.tenantId;
      const userId = context.user!.id;
      return caseService.createCase({ ...input, tenantId }, userId, {
        reason: input.reason || 'Initial creation',
        legalBasis: input.legalBasis || 'investigation',
      });
    }),
    updateCase: authGuard(async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      const tenantId = context.user!.tenantId;
      const userId = context.user!.id;
      return caseService.updateCase(input, userId, tenantId, {
        reason: input.reason || 'Updated case details',
        legalBasis: input.legalBasis || 'investigation',
      });
    }),
    archiveCase: authGuard(async (
      _: any,
      { id, reason, legalBasis }: { id: string; reason: string; legalBasis: LegalBasis },
      context: GraphQLContext
    ) => {
      const tenantId = context.user!.tenantId;
      const userId = context.user!.id;
      return caseService.archiveCase(id, userId, tenantId, { reason, legalBasis });
    }),
  },
  Case: {
    slaTimers: async (caseRecord: any) => {
      const slaService = (caseService as any).slaService;
      return slaService.getTimersForCase(caseRecord.id);
    },
    comments: async (caseRecord: any, { limit, offset }: any, context: GraphQLContext) => {
      // Logic to fetch comments for this case
      // This could use the commentService
      return []; // Placeholder
    }
  }
};
