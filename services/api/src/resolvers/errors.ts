import { GraphQLError } from 'graphql';

export interface ResolverErrorShape {
  __typename: 'ResolverError';
  message: string;
  code: string;
  retriable: boolean;
  details?: Record<string, unknown> | null;
}

export function toResolverError(
  error: unknown,
  fallbackCode: string,
  details?: Record<string, unknown>,
): ResolverErrorShape {
  if (error instanceof GraphQLError) {
    const code = typeof error.extensions?.code === 'string' ? error.extensions.code : fallbackCode;
    return {
      __typename: 'ResolverError',
      message: error.message,
      code,
      retriable: code === 'QUERY_TIMEOUT',
      details: (error.extensions?.details as Record<string, unknown> | null | undefined) ?? details ?? null,
    };
  }

  const message = error instanceof Error ? error.message : 'Unknown error';

  return {
    __typename: 'ResolverError',
    message,
    code: fallbackCode,
    retriable: fallbackCode === 'QUERY_TIMEOUT',
    details: details ?? null,
  };
}
