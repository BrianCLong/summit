import { PluginDefinition } from 'apollo-server-plugin-base';
import { PolicyEngine, defaultRules } from './policy';

const engine = new PolicyEngine(defaultRules);

const fieldToAction: Record<string, { action: string; resourceType: string }> = {
  'Query.case': { action: 'read', resourceType: 'case' },
  'Mutation.updateCase': { action: 'update', resourceType: 'case' },
  'Query.auditEvents': { action: 'read', resourceType: 'audit' },
  // Predictive links
  'Query.suggestLinks': { action: 'read', resourceType: 'graph' },
  'Query.explainSuggestion': { action: 'read', resourceType: 'graph' },
  'Mutation.resolveEntities': { action: 'update', resourceType: 'graph' },
  'Mutation.acceptSuggestion': { action: 'update', resourceType: 'graph' },
  'Mutation.rejectSuggestion': { action: 'update', resourceType: 'graph' },

export const graphqlAuthPlugin = (): PluginDefinition => ({
  requestDidStart: () => ({
    willResolveField({ context, info, args }) {
      const key = `${info.parentType.name}.${info.fieldName}`;
      const map = fieldToAction[key];
      if (!map) return () => {};
      const subject = context.user as any; // { id, roles, attrs: { tenantId } }
      const resource = {
        type: map.resourceType,
        id: args?.id || args?.input?.id || 'unknown',
        ownerId: args?.input?.ownerId,
        tenantId: args?.input?.tenantId || context.tenantId,
        attrs: args?.input || {},
      };
      const decision = engine.evaluate({ subject, action: map.action, resource });
      if (!decision.allowed) {
        throw Object.assign(new Error(decision.reason || 'Not authorized'), {
          extensions: { code: 'FORBIDDEN', policy: key },
        });
      }
      return () => {};
    },
  }),
});
