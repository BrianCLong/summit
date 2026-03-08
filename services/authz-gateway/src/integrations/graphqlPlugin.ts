import { authorize, type PolicyInput, type PolicyDecision } from '../policy';
import { features } from '../config';
import { log } from '../audit';

type HeaderSource =
  | Map<string, string>
  | { get: (key: string) => string | null };

interface GraphQLRequestContext {
  request: {
    http?: {
      headers?: HeaderSource;
      url?: string;
    };
  };
  contextValue?: Record<string, unknown>;
  errors?: Error[];
}

interface PolicyPluginOptions {
  action?: string;
  buildInput?: (ctx: GraphQLRequestContext) => PolicyInput;
  onDecision?: (decision: PolicyDecision, ctx: GraphQLRequestContext) => void;
}

function headerLookup(
  headers: HeaderSource | undefined,
): (name: string) => string {
  if (!headers) return () => '';
  if (headers instanceof Map) {
    return (name: string) =>
      headers.get(name.toLowerCase()) || headers.get(name) || '';
  }
  return (name: string) => headers.get(name) || '';
}

function defaultBuildInput(
  ctx: GraphQLRequestContext,
  action: string,
): PolicyInput {
  const getHeader = headerLookup(ctx.request.http?.headers);
  const purpose = getHeader('x-purpose');
  const authority = getHeader('x-authority');
  const user = (ctx.contextValue?.user as Record<string, unknown>) || {};
  const roles = (user.roles as string[]) || [];
  const tenantId = String(user.tenantId || '');
  return {
    user: {
      sub: String(user.sub || ''),
      tenantId,
      roles,
      ...user,
    },
    resource: {
      path: ctx.request.http?.url || 'graphql',
      tenantId,
      attributes: {},
    },
    action,
    purpose: purpose || '',
    authority: authority || '',
  };
}

export function createPolicyPlugin(options: PolicyPluginOptions = {}) {
  const action = options.action || 'query';
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(ctx: GraphQLRequestContext) {
          if (!features.policyReasoner) {
            return;
          }
          const input = options.buildInput
            ? options.buildInput(ctx)
            : defaultBuildInput(ctx, action);
          const decision = await authorize(input);
          const audit = log({
            subject: String(input.user.sub || 'anonymous'),
            action,
            resource: JSON.stringify(input.resource),
            tenantId: String(input.user.tenantId || ''),
            decision,
            purpose: input.purpose,
            authority: input.authority,
          });
          ctx.contextValue = ctx.contextValue || {};
          ctx.contextValue.policyDecision = decision;
          ctx.contextValue.policyAuditId = audit.id;
          options.onDecision?.(decision, ctx);
          if (!decision.allowed) {
            const error = new Error(`Access denied: ${decision.reason}`);
            (
              error as Error & { extensions?: Record<string, unknown> }
            ).extensions = {
              code: 'FORBIDDEN',
              policyId: decision.policyId,
              appealLink: decision.appealLink,
              appealToken: decision.appealToken,
            };
            ctx.errors = ctx.errors ? [...ctx.errors, error] : [error];
          }
        },
      };
    },
  };
}
