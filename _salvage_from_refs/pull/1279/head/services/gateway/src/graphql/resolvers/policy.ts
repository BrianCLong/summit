/**
 * Policy GraphQL Resolvers
 *
 * Implements GraphQL operations for policy evaluation,
 * privacy settings, licensing controls, and governance management.
 */

import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import { pubsub } from '../pubsub';
import { OPAIntegration } from '../../policy/opa-integration';
import { PrivacyReasoner } from '../../policy/privacy-reasoner';
import { LicensingEnforcement } from '../../policy/licensing-enforcement';
import { logger } from '../../utils/logger';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

// Custom JSON scalar
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  }
});

// Custom DateTime scalar
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize: (value: Date) => value.toISOString(),
  parseValue: (value: string) => new Date(value),
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
});

export const policyResolvers = {
  // Custom scalars
  JSON: JSONScalar,
  DateTime: DateTimeScalar,

  Query: {
    // Evaluate comprehensive policy
    evaluatePolicy: async (
      _: any,
      { input }: { input: any },
      { user, opaIntegration }: { user: any; opaIntegration: OPAIntegration }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        logger.info('Evaluating policy', {
          tenantId: input.tenantId,
          resource: input.resource,
          action: input.action,
          userId: user.id
        });

        const result = await opaIntegration.evaluatePolicy({
          tenantId: input.tenantId,
          userId: input.userId || user.id,
          resource: input.resource,
          action: input.action,
          context: input.context || {},
          skipCache: input.skipCache
        });

        // Publish to subscription
        pubsub.publish('POLICY_EVALUATION', {
          policyEvaluationEvents: result,
          tenantId: input.tenantId,
          resource: input.resource
        });

        return result;

      } catch (error) {
        logger.error('Policy evaluation failed', { error, input });
        throw new Error(`Policy evaluation failed: ${error.message}`);
      }
    },

    // Privacy policy evaluation
    evaluatePrivacyPolicy: async (
      _: any,
      { input }: { input: any },
      { user, privacyReasoner }: { user: any; privacyReasoner: PrivacyReasoner }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const result = await privacyReasoner.evaluatePrivacyPolicy({
          tenantId: input.tenantId,
          userId: input.userId || user.id,
          dataType: input.dataType,
          purpose: input.purpose,
          retention: input.retention,
          context: input.context || {}
        });

        return result;

      } catch (error) {
        logger.error('Privacy policy evaluation failed', { error, input });
        throw new Error(`Privacy policy evaluation failed: ${error.message}`);
      }
    },

    // License enforcement check
    enforceLicense: async (
      _: any,
      { input }: { input: any },
      { user, licensingEnforcement }: { user: any; licensingEnforcement: LicensingEnforcement }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const result = await licensingEnforcement.enforceLicense({
          tenantId: input.tenantId,
          operation: input.operation,
          resource: input.resource,
          quantity: input.quantity || 1,
          context: input.context || {}
        });

        // Publish license usage updates
        if (result.usage) {
          pubsub.publish('LICENSE_USAGE_UPDATE', {
            licenseUsageUpdates: result.usage,
            tenantId: input.tenantId
          });
        }

        return result;

      } catch (error) {
        logger.error('License enforcement failed', { error, input });
        throw new Error(`License enforcement failed: ${error.message}`);
      }
    },

    // Governance policy evaluation
    evaluateGovernancePolicy: async (
      _: any,
      { input }: { input: any },
      { user, opaIntegration }: { user: any; opaIntegration: OPAIntegration }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const result = await opaIntegration.evaluateGovernancePolicy(input);
        return result;

      } catch (error) {
        logger.error('Governance policy evaluation failed', { error, input });
        throw new Error(`Governance policy evaluation failed: ${error.message}`);
      }
    },

    // Get policy configurations
    policyConfigurations: async (
      _: any,
      { tenantId, type, enabled }: { tenantId: string; type?: string; enabled?: boolean },
      { user, db }: { user: any; db: any }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const filters: any = { tenant_id: tenantId };
        if (type) filters.type = type;
        if (enabled !== undefined) filters.enabled = enabled;

        const configs = await db('policy_configurations')
          .select('*')
          .where(filters)
          .orderBy('created_at', 'desc');

        return configs.map((config: any) => ({
          id: config.id,
          tenantId: config.tenant_id,
          type: config.type,
          name: config.name,
          description: config.description,
          enabled: config.enabled,
          rules: config.rules,
          metadata: config.metadata,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
          createdBy: config.created_by
        }));

      } catch (error) {
        logger.error('Failed to fetch policy configurations', { error, tenantId });
        throw new Error(`Failed to fetch policy configurations: ${error.message}`);
      }
    },

    // Get policy configuration by ID
    policyConfiguration: async (
      _: any,
      { id }: { id: string },
      { user, db }: { user: any; db: any }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const config = await db('policy_configurations')
          .select('*')
          .where({ id })
          .first();

        if (!config) {
          return null;
        }

        return {
          id: config.id,
          tenantId: config.tenant_id,
          type: config.type,
          name: config.name,
          description: config.description,
          enabled: config.enabled,
          rules: config.rules,
          metadata: config.metadata,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
          createdBy: config.created_by
        };

      } catch (error) {
        logger.error('Failed to fetch policy configuration', { error, id });
        throw new Error(`Failed to fetch policy configuration: ${error.message}`);
      }
    },

    // Get license usage for tenant
    licenseUsage: async (
      _: any,
      { tenantId }: { tenantId: string },
      { user, licensingEnforcement }: { user: any; licensingEnforcement: LicensingEnforcement }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const usage = await licensingEnforcement.getLicenseUsage(tenantId);
        return usage;

      } catch (error) {
        logger.error('Failed to fetch license usage', { error, tenantId });
        throw new Error(`Failed to fetch license usage: ${error.message}`);
      }
    },

    // Get policy evaluation history
    policyEvaluationHistory: async (
      _: any,
      { tenantId, resource, action, limit, offset }: any,
      { user, db }: { user: any; db: any }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        let query = db('policy_evaluations')
          .select('*')
          .where({ tenant_id: tenantId });

        if (resource) query = query.where({ resource });
        if (action) query = query.where({ action });

        const evaluations = await query
          .orderBy('evaluated_at', 'desc')
          .limit(limit)
          .offset(offset);

        return evaluations.map((eval: any) => ({
          allowed: eval.allowed,
          violations: eval.violations || [],
          reason: eval.reason,
          metadata: eval.metadata,
          evaluatedAt: eval.evaluated_at,
          cacheHit: eval.cache_hit || false
        }));

      } catch (error) {
        logger.error('Failed to fetch policy evaluation history', { error, tenantId });
        throw new Error(`Failed to fetch policy evaluation history: ${error.message}`);
      }
    },

    // Health check for policy services
    policyHealthCheck: async (
      _: any,
      __: any,
      { opaIntegration, privacyReasoner, licensingEnforcement }: any
    ) => {
      try {
        const [opaHealth, privacyHealth, licensingHealth] = await Promise.all([
          opaIntegration.healthCheck(),
          privacyReasoner.healthCheck(),
          licensingEnforcement.healthCheck()
        ]);

        return {
          opa: opaHealth,
          privacy: privacyHealth,
          licensing: licensingHealth,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        logger.error('Policy health check failed', { error });
        throw new Error(`Policy health check failed: ${error.message}`);
      }
    }
  },

  Mutation: {
    // Create policy configuration
    createPolicyConfiguration: async (
      _: any,
      { input }: { input: any },
      { user, db }: { user: any; db: any }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const configData = {
          tenant_id: input.tenantId,
          type: input.type,
          name: input.name,
          description: input.description,
          enabled: input.enabled,
          rules: input.rules,
          metadata: input.metadata || {},
          created_by: user.id,
          created_at: new Date(),
          updated_at: new Date()
        };

        const [id] = await db('policy_configurations').insert(configData);

        const config = await db('policy_configurations')
          .select('*')
          .where({ id })
          .first();

        return {
          id: config.id,
          tenantId: config.tenant_id,
          type: config.type,
          name: config.name,
          description: config.description,
          enabled: config.enabled,
          rules: config.rules,
          metadata: config.metadata,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
          createdBy: config.created_by
        };

      } catch (error) {
        logger.error('Failed to create policy configuration', { error, input });
        throw new Error(`Failed to create policy configuration: ${error.message}`);
      }
    },

    // Update policy configuration
    updatePolicyConfiguration: async (
      _: any,
      { id, input }: { id: string; input: any },
      { user, db }: { user: any; db: any }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const updateData = {
          tenant_id: input.tenantId,
          type: input.type,
          name: input.name,
          description: input.description,
          enabled: input.enabled,
          rules: input.rules,
          metadata: input.metadata || {},
          updated_at: new Date()
        };

        await db('policy_configurations')
          .where({ id })
          .update(updateData);

        const config = await db('policy_configurations')
          .select('*')
          .where({ id })
          .first();

        if (!config) {
          throw new Error('Policy configuration not found');
        }

        return {
          id: config.id,
          tenantId: config.tenant_id,
          type: config.type,
          name: config.name,
          description: config.description,
          enabled: config.enabled,
          rules: config.rules,
          metadata: config.metadata,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
          createdBy: config.created_by
        };

      } catch (error) {
        logger.error('Failed to update policy configuration', { error, id, input });
        throw new Error(`Failed to update policy configuration: ${error.message}`);
      }
    },

    // Delete policy configuration
    deletePolicyConfiguration: async (
      _: any,
      { id }: { id: string },
      { user, db }: { user: any; db: any }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const deleted = await db('policy_configurations')
          .where({ id })
          .del();

        return deleted > 0;

      } catch (error) {
        logger.error('Failed to delete policy configuration', { error, id });
        throw new Error(`Failed to delete policy configuration: ${error.message}`);
      }
    },

    // Reset license usage counters
    resetLicenseUsage: async (
      _: any,
      { tenantId, counter }: { tenantId: string; counter?: string },
      { user, licensingEnforcement }: { user: any; licensingEnforcement: LicensingEnforcement }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        await licensingEnforcement.resetUsageCounters(tenantId, counter);
        const usage = await licensingEnforcement.getLicenseUsage(tenantId);

        // Publish license usage updates
        pubsub.publish('LICENSE_USAGE_UPDATE', {
          licenseUsageUpdates: usage,
          tenantId
        });

        return usage;

      } catch (error) {
        logger.error('Failed to reset license usage', { error, tenantId, counter });
        throw new Error(`Failed to reset license usage: ${error.message}`);
      }
    },

    // Clear policy evaluation cache
    clearPolicyCache: async (
      _: any,
      { tenantId, resource, action }: { tenantId?: string; resource?: string; action?: string },
      { user, opaIntegration }: { user: any; opaIntegration: OPAIntegration }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        await opaIntegration.clearCache(tenantId, resource, action);
        return true;

      } catch (error) {
        logger.error('Failed to clear policy cache', { error, tenantId, resource, action });
        throw new Error(`Failed to clear policy cache: ${error.message}`);
      }
    },

    // Bulk evaluate policies
    bulkEvaluatePolicy: async (
      _: any,
      { inputs }: { inputs: any[] },
      { user, opaIntegration }: { user: any; opaIntegration: OPAIntegration }
    ) => {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const results = await Promise.all(
          inputs.map(async (input) => {
            try {
              return await opaIntegration.evaluatePolicy({
                tenantId: input.tenantId,
                userId: input.userId || user.id,
                resource: input.resource,
                action: input.action,
                context: input.context || {},
                skipCache: input.skipCache
              });
            } catch (error) {
              logger.error('Bulk policy evaluation failed for input', { error, input });
              return {
                allowed: false,
                violations: [{
                  type: 'EVALUATION_ERROR',
                  severity: 'CRITICAL',
                  message: error.message,
                  resource: input.resource,
                  action: input.action
                }],
                reason: `Evaluation failed: ${error.message}`,
                metadata: { error: error.message },
                evaluatedAt: new Date(),
                cacheHit: false
              };
            }
          })
        );

        return results;

      } catch (error) {
        logger.error('Bulk policy evaluation failed', { error, inputCount: inputs.length });
        throw new Error(`Bulk policy evaluation failed: ${error.message}`);
      }
    }
  },

  Subscription: {
    // Real-time policy violations
    policyViolations: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['POLICY_VIOLATION']),
        (payload, variables) => {
          return payload.policyViolations.tenantId === variables.tenantId;
        }
      )
    },

    // License usage updates
    licenseUsageUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['LICENSE_USAGE_UPDATE']),
        (payload, variables) => {
          return payload.tenantId === variables.tenantId;
        }
      )
    },

    // Policy evaluation events
    policyEvaluationEvents: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['POLICY_EVALUATION']),
        (payload, variables) => {
          return payload.tenantId === variables.tenantId &&
                 (!variables.resource || payload.resource === variables.resource);
        }
      )
    }
  }
};