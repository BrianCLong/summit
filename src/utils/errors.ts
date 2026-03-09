export type StableErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'DEPENDENCY_FAILURE'
  | 'UNKNOWN';

export interface ErrorResponse {
  code: StableErrorCode;
  httpStatus: number;
  message: string;
  details?: Record<string, unknown>;
}

function normalizeStatus(error: any): number | undefined {
  return error?.status ?? error?.statusCode ?? error?.httpStatus;
}

function mapStatusToCode(status?: number, fallback: StableErrorCode = 'UNKNOWN'): StableErrorCode {
  if (!status) return fallback;
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 408) return 'TIMEOUT';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'DEPENDENCY_FAILURE';
  return fallback;
}

export function mapErrorToResponse(error: unknown): ErrorResponse {
  if (!error) {
    return {
      code: 'UNKNOWN',
      httpStatus: 500,
      message: 'Unknown error',
    };
  }

  const status = normalizeStatus(error);
  const explicitCode = (error as any)?.code as StableErrorCode | undefined;
  const normalizedCode = explicitCode ?? mapStatusToCode(status);

  switch (normalizedCode) {
    case 'VALIDATION_ERROR':
      return { code: 'VALIDATION_ERROR', httpStatus: 400, message: (error as Error).message };
    case 'NOT_FOUND':
      return { code: 'NOT_FOUND', httpStatus: 404, message: (error as Error).message || 'Resource not found' };
    case 'CONFLICT':
      return { code: 'CONFLICT', httpStatus: 409, message: (error as Error).message || 'Conflict detected' };
    case 'UNAUTHORIZED':
      return { code: 'UNAUTHORIZED', httpStatus: 401, message: (error as Error).message || 'Unauthorized' };
    case 'FORBIDDEN':
      return { code: 'FORBIDDEN', httpStatus: 403, message: (error as Error).message || 'Forbidden' };
    case 'RATE_LIMITED':
      return { code: 'RATE_LIMITED', httpStatus: 429, message: (error as Error).message || 'Rate limit exceeded' };
    case 'TIMEOUT':
      return { code: 'TIMEOUT', httpStatus: 408, message: (error as Error).message || 'Request timed out' };
    case 'DEPENDENCY_FAILURE':
      return {
        code: 'DEPENDENCY_FAILURE',
        httpStatus: status && status >= 500 ? status : 502,
        message: (error as Error).message || 'Upstream dependency failure',
      };
    default:
      return {
        code: 'UNKNOWN',
        httpStatus: status && status >= 400 ? status : 500,
        message: (error as Error).message || 'Unexpected error',
      };
  }
}
