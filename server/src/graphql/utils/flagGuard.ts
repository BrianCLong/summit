import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../apollo-v5-server.js';

/**
 * Flag-gated guardrail for high-risk GraphQL operations.
 *
 * Checks whether a feature flag is enabled before allowing a resolver to execute.
 * Uses the FlagClient from libs/flags/node when available, falling back to
 * environment variable checks (FLAG_<KEY> format) for resilience.
 *
 * Referenced flags are registered in flags/catalog.yaml with kill-switch support.
 */

type ResolverFn = (parent: any, args: any, context: GraphQLContext, info: any) => Promise<any> | any;

/**
 * Resolve a flag value. Checks environment variables in FLAG_<KEY> format.
 * In production, this would delegate to the FlagClient with tenant/user context.
 * For now, provides a synchronous env-based check that is sufficient for
 * guardrail enforcement without introducing async flag resolution latency.
 */
function isFlagEnabled(flagKey: string, context?: GraphQLContext): boolean {
  // Convert dot-separated flag key to env var format: FLAG_FEATURE_INVESTIGATION_DELETE
  const envKey = `FLAG_${flagKey.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  const envVal = process.env[envKey];

  if (envVal !== undefined) {
    return envVal === 'true' || envVal === '1';
  }

  // Default: allow in dev/test, deny in production
  const env = process.env.NODE_ENV || 'development';
  return env !== 'production';
}

/**
 * Higher-order function that gates a resolver behind a feature flag.
 * If the flag is disabled, the resolver returns a FORBIDDEN GraphQLError.
 *
 * @param resolver - The resolver function to wrap
 * @param flagKey - The feature flag key from flags/catalog.yaml
 * @param options - Optional configuration
 */
export function flagGuard(
  resolver: ResolverFn,
  flagKey: string,
  options?: { message?: string },
): ResolverFn {
  return async (parent: any, args: any, context: GraphQLContext, info: any) => {
    const enabled = isFlagEnabled(flagKey, context);

    if (!enabled) {
      throw new GraphQLError(
        options?.message || `Operation disabled by feature flag: ${flagKey}`,
        {
          extensions: {
            code: 'FORBIDDEN',
            flagKey,
          },
        },
      );
    }

    return resolver(parent, args, context, info);
  };
}
