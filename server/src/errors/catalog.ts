
/**
 * Standardized Error Catalog
 * Source of truth for all application errors.
 */

export interface ErrorDefinition {
  code: string;
  status: number;
  message: string;
  remediation: string;
  category: 'Security' | 'Validation' | 'Resource' | 'Business' | 'System';
}

export type ErrorKey = keyof typeof MasterErrorCatalog;

export const MasterErrorCatalog = {
  // Security Errors (1xxx)
  AUTH_INVALID_TOKEN: {
    code: 'E1001',
    status: 401,
    message: 'Invalid authentication token provided.',
    remediation: 'Please refresh your token or log in again.',
    category: 'Security',
  },
  AUTH_EXPIRED_TOKEN: {
    code: 'E1002',
    status: 401,
    message: 'Authentication token has expired.',
    remediation: 'Obtain a new token via the refresh endpoint.',
    category: 'Security',
  },
  AUTH_INSUFFICIENT_PERMISSIONS: {
    code: 'E1003',
    status: 403,
    message: 'Insufficient permissions to perform this action.',
    remediation: 'Contact your administrator to request access.',
    category: 'Security',
  },

  // Validation Errors (2xxx)
  VALIDATION_BAD_INPUT: {
    code: 'E2001',
    status: 400,
    message: 'The provided input is invalid.',
    remediation: 'Check the input parameters and try again.',
    category: 'Validation',
  },

  // Resource Errors (3xxx)
  RESOURCE_NOT_FOUND: {
    code: 'E3001',
    status: 404,
    message: 'The requested resource was not found.',
    remediation: 'Verify the resource ID and ensure it exists.',
    category: 'Resource',
  },

  // System Errors (9xxx)
  INTERNAL_SERVER_ERROR: {
    code: 'E9001',
    status: 500,
    message: 'An internal server error occurred.',
    remediation: 'Please try again later or contact support.',
    category: 'System',
  },
} as const satisfies Record<string, ErrorDefinition>;
