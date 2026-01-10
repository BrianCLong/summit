import { GraphQLError } from 'graphql';
import { Action, ResourceRef } from '../types/identity.js';

export type MutationPolicy = {
  action: Action;
  roles: string[];
};

export const mutationRoleMatrix: Record<string, MutationPolicy> = {
  aiExtractEntities: { action: 'execute', roles: ['analyst', 'admin'] },
  aiResolveEntities: { action: 'execute', roles: ['analyst', 'admin'] },
  aiLinkPredict: { action: 'execute', roles: ['analyst', 'admin'] },
  aiCommunityDetect: { action: 'execute', roles: ['analyst', 'admin'] },
  approveInsight: { action: 'approve', roles: ['admin'] },
  rejectInsight: { action: 'approve', roles: ['admin'] },

  createMLModel: { action: 'create', roles: ['ml_admin', 'admin'] },
  trainMLModel: { action: 'execute', roles: ['ml_admin', 'ml_engineer', 'admin'] },
  runMLInference: { action: 'execute', roles: ['ml_engineer', 'analyst', 'admin'] },
  optimizeMLModel: { action: 'update', roles: ['ml_admin', 'admin'] },
  runQuantumOptimization: { action: 'execute', roles: ['researcher', 'admin'] },
  analyzeGraphWithML: { action: 'execute', roles: ['analyst', 'admin'] },
  optimizeGraphWithQuantum: { action: 'execute', roles: ['researcher', 'admin'] },
  deleteMLModel: { action: 'delete', roles: ['ml_admin', 'admin'] },

  createWatchlist: { action: 'create', roles: ['analyst', 'admin'] },
  addToWatchlist: { action: 'update', roles: ['analyst', 'admin'] },
  removeFromWatchlist: { action: 'update', roles: ['analyst', 'admin'] },
  importWatchlistCsv: { action: 'create', roles: ['analyst', 'admin'] },
  exportWatchlistCsv: { action: 'execute', roles: ['analyst', 'admin'] },
  deleteWatchlist: { action: 'delete', roles: ['admin'] },

  createCheckout: { action: 'create', roles: ['billing_admin', 'admin'] },

  exportWithProvenance: { action: 'execute', roles: ['analyst', 'admin'] },

  pqcGenerateKeyPair: { action: 'create', roles: ['crypto_admin', 'admin'] },
  pqcGenerateHybridKeyPair: { action: 'create', roles: ['crypto_admin', 'admin'] },
  pqcEncapsulate: { action: 'execute', roles: ['crypto_admin', 'admin'] },
  pqcDecapsulate: { action: 'execute', roles: ['crypto_admin', 'admin'] },
  pqcSign: { action: 'execute', roles: ['crypto_admin', 'admin'] },
  pqcVerify: { action: 'execute', roles: ['crypto_admin', 'admin', 'auditor'] },
  pqcDeleteKey: { action: 'delete', roles: ['crypto_admin', 'admin'] },
  pqcRotateKey: { action: 'update', roles: ['crypto_admin', 'admin'] },
  pqcValidateAlgorithm: { action: 'execute', roles: ['crypto_admin', 'admin', 'researcher'] },
  pqcBenchmarkAlgorithm: { action: 'execute', roles: ['crypto_admin', 'admin', 'researcher'] },
};

export function mutationResource(
  id: string,
  tenantId: string,
  attributes?: Record<string, unknown>,
): ResourceRef {
  return {
    type: 'mutation',
    id,
    tenantId,
    attributes,
  };
}

export function assertMutationAllowed(
  action: Action,
  resource: ResourceRef,
  roles: string[] = [],
  tenantId?: string,
) {
  if (tenantId && tenantId !== resource.tenantId) {
    throw new GraphQLError('Forbidden: tenant mismatch', {
      extensions: { code: 'FORBIDDEN', action, resource },
    });
  }

  const matrixEntry = mutationRoleMatrix[resource.id || ''];
  if (!matrixEntry) {
    throw new GraphQLError('Forbidden: unknown mutation', {
      extensions: { code: 'FORBIDDEN', action, resource },
    });
  }

  const actionMatches = matrixEntry.action === action;
  const hasRole = roles.some((role) => matrixEntry.roles.includes(role));

  if (!actionMatches || !hasRole) {
    throw new GraphQLError('Forbidden', {
      extensions: {
        code: 'FORBIDDEN',
        action,
        resource,
        reason: actionMatches ? 'role_mismatch' : 'action_mismatch',
      },
    });
  }
}
