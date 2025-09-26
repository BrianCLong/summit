import type { GraphQLError, GraphQLFormattedError } from 'graphql';
import logger, { sanitizeForLogging } from '../config/logger';

const VALIDATION_CODES = new Set(['GRAPHQL_PARSE_FAILED', 'GRAPHQL_VALIDATION_FAILED']);
const AUTHENTICATION_CODES = new Set(['UNAUTHENTICATED', 'FORBIDDEN']);
const PERSISTED_QUERY_CODES = new Set(['PERSISTED_QUERY_NOT_FOUND', 'PERSISTED_QUERY_NOT_SUPPORTED']);

const GENERIC_MESSAGE =
  'We ran into an unexpected issue while processing your request. Please try again or contact support if the issue persists.';
const VALIDATION_MESSAGE =
  'Your GraphQL query could not be validated. Please check the operation name, fields, and syntax before trying again.';
const TIMEOUT_MESSAGE =
  'The request took longer than expected and timed out. Please try again with a smaller query or after a short pause.';
const PERMISSION_MESSAGE = 'You do not have permission to perform this action.';
const AUTH_MESSAGE = 'Authentication is required to complete this request.';
const PERSISTED_QUERY_MESSAGE =
  'The persisted query referenced by your client could not be found. Refresh your client cache and retry the operation.';
const BAD_INPUT_MESSAGE =
  'Some of the data you provided is invalid. Please review the request payload and try again.';

export function formatGraphQLError(error: GraphQLError): GraphQLFormattedError {
  const code = typeof error.extensions?.code === 'string' ? error.extensions.code : 'INTERNAL_SERVER_ERROR';
  const requestId = extractRequestId(error);

  const message = deriveUserMessage(code, error.message);

  logger.error('GraphQL execution error', {
    logType: 'graphql_error',
    code,
    path: error.path,
    requestId,
    originalMessage: error.message,
    extensions: sanitizeForLogging(error.extensions ?? {}),
  });

  const extensions: Record<string, unknown> = { code };
  if (requestId) {
    extensions.requestId = requestId;
  }

  if (process.env.NODE_ENV !== 'production') {
    extensions.debug = {
      originalMessage: error.message,
      locations: error.locations,
    };
  }

  return {
    message,
    locations: error.locations,
    path: error.path,
    extensions,
  };
}

function deriveUserMessage(code: string, originalMessage: string): string {
  if (VALIDATION_CODES.has(code)) {
    return VALIDATION_MESSAGE;
  }

  if (code === 'BAD_USER_INPUT') {
    return originalMessage || BAD_INPUT_MESSAGE;
  }

  if (code === 'GRAPHQL_TIMEOUT' || /timeout/i.test(originalMessage)) {
    return TIMEOUT_MESSAGE;
  }

  if (PERSISTED_QUERY_CODES.has(code)) {
    return PERSISTED_QUERY_MESSAGE;
  }

  if (AUTHENTICATION_CODES.has(code)) {
    return code === 'UNAUTHENTICATED' ? AUTH_MESSAGE : PERMISSION_MESSAGE;
  }

  if (code === 'REQUEST_LIMIT_EXCEEDED') {
    return 'This request exceeds the allowed rate or complexity limits. Please wait a moment and try again.';
  }

  return GENERIC_MESSAGE;
}

function extractRequestId(error: GraphQLError): string | undefined {
  const extensionId = error.extensions?.requestId ?? error.extensions?.traceId ?? error.extensions?.id;
  if (typeof extensionId === 'string' && extensionId.trim().length > 0) {
    return extensionId;
  }

  const originalRequestId = (error.originalError as { requestId?: string } | undefined)?.requestId;
  if (typeof originalRequestId === 'string' && originalRequestId.trim().length > 0) {
    return originalRequestId;
  }

  return undefined;
}
