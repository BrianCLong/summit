/**
 * Gateway Tenant Context
 * Provides secure tenant isolation at the API gateway layer
 *
 * ✅ SCAFFOLD ELIMINATED: Added comprehensive tenant ID validation and security controls
 */

/**
 * Tenant context with comprehensive security information
 */
export interface TenantContext {
  tenantId: string;

  // User information for audit trails
  userId?: string;
  userEmail?: string;

  // Access control
  roles?: string[];
  permissions?: string[];

  // Request metadata for security monitoring
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Timestamp for audit trails
  timestamp: Date;
}

/**
 * Tenant ID validation configuration
 */
export interface TenantValidationConfig {
  /**
   * Minimum tenant ID length (default: 1)
   */
  minLength?: number;

  /**
   * Maximum tenant ID length (default: 100)
   */
  maxLength?: number;

  /**
   * Allowed character pattern (default: alphanumeric, hyphens, underscores)
   */
  allowedPattern?: RegExp;

  /**
   * Throw error on invalid tenant ID (default: true)
   */
  strict?: boolean;
}

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION: Required<TenantValidationConfig> = {
  minLength: 1,
  maxLength: 100,
  allowedPattern: /^[a-zA-Z0-9_-]+$/,
  strict: true,
};

/**
 * Validate tenant ID format and security constraints
 *
 * ✅ SECURITY FIX: Added comprehensive validation to prevent injection attacks
 *
 * PREVIOUS VULNERABILITY:
 * - Accepted any string as tenantId
 * - No format validation
 * - No length limits
 * - Could allow path traversal (.., /, \)
 * - Could allow injection attacks
 *
 * NEW SECURE APPROACH:
 * - Whitelist validation (alphanumeric, hyphens, underscores only)
 * - Length limits (1-100 characters)
 * - Rejects special characters that could enable attacks
 * - Clear error messages for debugging
 *
 * @param tenantId - Tenant ID to validate
 * @param config - Validation configuration
 * @returns Sanitized tenant ID
 * @throws Error if tenant ID is invalid and strict mode enabled
 */
export function validateTenantId(
  tenantId: string,
  config: TenantValidationConfig = {},
): string {
  const {
    minLength,
    maxLength,
    allowedPattern,
    strict,
  } = { ...DEFAULT_VALIDATION, ...config };

  // Check for empty/null
  if (!tenantId || typeof tenantId !== 'string') {
    const error = 'Tenant ID is required and must be a string';
    if (strict) {
      throw new Error(error);
    }
    console.warn(`[TENANT] ${error}`);
    return '';
  }

  // Trim whitespace (common mistake)
  const trimmed = tenantId.trim();

  // Length validation
  if (trimmed.length < minLength) {
    const error = `Tenant ID must be at least ${minLength} character(s), got: ${trimmed.length}`;
    if (strict) {
      throw new Error(error);
    }
    console.warn(`[TENANT] ${error}`);
    return '';
  }

  if (trimmed.length > maxLength) {
    const error = `Tenant ID must be at most ${maxLength} characters, got: ${trimmed.length}`;
    if (strict) {
      throw new Error(error);
    }
    console.warn(`[TENANT] ${error}`);
    return trimmed.slice(0, maxLength);
  }

  // Format validation (character whitelist)
  if (!allowedPattern.test(trimmed)) {
    const error =
      `Tenant ID contains invalid characters. ` +
      `Only alphanumeric characters, hyphens, and underscores are allowed. ` +
      `Got: "${trimmed}"`;
    if (strict) {
      throw new Error(error);
    }
    console.warn(`[TENANT] ${error}`);
    return '';
  }

  // Additional security checks
  const dangerousPatterns = [
    /\.\./,     // Path traversal
    /[<>]/,     // HTML/XML injection
    /[;|&]/,    // Command injection
    /['"`]/,    // SQL injection
    /\$/,       // Template injection
    /\\/,       // Path separator
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      const error = `Tenant ID contains potentially dangerous characters: "${trimmed}"`;
      if (strict) {
        throw new Error(error);
      }
      console.warn(`[TENANT] ${error}`);
      return '';
    }
  }

  return trimmed;
}

/**
 * Extract and validate tenant context from request headers
 *
 * ✅ SECURITY FIX: Added validation, user context, and audit trail support
 *
 * @param headers - Request headers
 * @param config - Validation configuration
 * @returns Validated tenant context
 * @throws Error if tenant header missing or invalid
 */
export function requireTenant(
  headers: Record<string, string | string[] | undefined>,
  config: TenantValidationConfig = {},
): TenantContext {
  // Extract tenant ID from headers (support multiple header names)
  const candidate =
    headers['x-tenant-id'] ||
    headers['x-tenant'] ||
    headers['tenant-id'] ||
    headers['tenantid'];

  const rawTenantId = Array.isArray(candidate) ? candidate[0] : candidate;

  if (!rawTenantId) {
    throw new Error(
      'Tenant header is required for data access. ' +
      'Provide x-tenant-id, x-tenant, tenant-id, or tenantid header.'
    );
  }

  // Validate tenant ID format
  const tenantId = validateTenantId(rawTenantId, config);

  if (!tenantId) {
    throw new Error('Invalid tenant ID format after validation');
  }

  // Extract user context from headers (if available)
  const userIdCandidate = headers['x-user-id'] || headers['user-id'];
  const userId = Array.isArray(userIdCandidate)
    ? userIdCandidate[0]
    : userIdCandidate;

  const userEmailCandidate = headers['x-user-email'] || headers['user-email'];
  const userEmail = Array.isArray(userEmailCandidate)
    ? userEmailCandidate[0]
    : userEmailCandidate;

  const rolesCandidate = headers['x-user-roles'] || headers['user-roles'];
  const rolesString = Array.isArray(rolesCandidate)
    ? rolesCandidate[0]
    : rolesCandidate;
  const roles = rolesString ? rolesString.split(',').map(r => r.trim()) : undefined;

  const permissionsCandidate = headers['x-user-permissions'] || headers['user-permissions'];
  const permissionsString = Array.isArray(permissionsCandidate)
    ? permissionsCandidate[0]
    : permissionsCandidate;
  const permissions = permissionsString
    ? permissionsString.split(',').map(p => p.trim())
    : undefined;

  // Extract request metadata
  const requestIdCandidate = headers['x-request-id'] || headers['request-id'];
  const requestId = Array.isArray(requestIdCandidate)
    ? requestIdCandidate[0]
    : requestIdCandidate;

  const ipCandidate =
    headers['x-forwarded-for'] ||
    headers['x-real-ip'] ||
    headers['remote-addr'];
  const ipAddress = Array.isArray(ipCandidate) ? ipCandidate[0] : ipCandidate;

  const userAgentCandidate = headers['user-agent'];
  const userAgent = Array.isArray(userAgentCandidate)
    ? userAgentCandidate[0]
    : userAgentCandidate;

  // Build comprehensive tenant context
  const context: TenantContext = {
    tenantId,
    userId,
    userEmail,
    roles,
    permissions,
    requestId,
    ipAddress,
    userAgent,
    timestamp: new Date(),
  };

  // Log tenant access for audit trail
  console.log(
    `[TENANT] Access granted: tenant=${tenantId}, user=${userId || 'anonymous'}, ` +
    `ip=${ipAddress || 'unknown'}, request=${requestId || 'none'}`
  );

  return context;
}

/**
 * Optional tenant extraction (doesn't throw if missing)
 *
 * @param headers - Request headers
 * @param config - Validation configuration
 * @returns Tenant context or null if not present
 */
export function optionalTenant(
  headers: Record<string, string | string[] | undefined>,
  config: TenantValidationConfig = {},
): TenantContext | null {
  try {
    return requireTenant(headers, { ...config, strict: false });
  } catch (error) {
    // Tenant not present or invalid - return null
    return null;
  }
}

/**
 * Merge tenant context into payload
 *
 * @param tenant - Tenant context
 * @param payload - Data payload
 * @returns Payload with tenantId added
 */
export function withTenant<T extends { [key: string]: unknown }>(
  tenant: TenantContext,
  payload: T,
): T & { tenantId: string } {
  return {
    ...payload,
    tenantId: tenant.tenantId,
  };
}

/**
 * Verify user has access to tenant
 *
 * @param context - Tenant context with user information
 * @param requiredTenantId - Tenant ID being accessed
 * @throws Error if user lacks access to tenant
 */
export function verifyTenantAccess(
  context: TenantContext,
  requiredTenantId: string,
): void {
  if (context.tenantId !== requiredTenantId) {
    console.error(
      `[TENANT] SECURITY: Cross-tenant access denied. ` +
      `User tenant=${context.tenantId}, requested=${requiredTenantId}, ` +
      `user=${context.userId || 'anonymous'}`
    );
    throw new Error(
      `Access denied: user belongs to tenant ${context.tenantId} but attempted to access tenant ${requiredTenantId}`
    );
  }
}

/**
 * Check if user has platform admin role
 *
 * @param context - Tenant context
 * @returns true if user has platform-admin or super-admin role
 */
export function isPlatformAdmin(context: TenantContext): boolean {
  if (!context.roles || context.roles.length === 0) {
    return false;
  }

  const adminRoles = ['platform-admin', 'super-admin', 'system'];
  return context.roles.some(role =>
    adminRoles.includes(role.toLowerCase())
  );
}

/**
 * Create audit log entry for tenant access
 *
 * @param context - Tenant context
 * @param action - Action performed
 * @param resource - Resource accessed
 * @returns Audit log entry
 */
export function createTenantAuditLog(
  context: TenantContext,
  action: string,
  resource: string,
): {
  timestamp: Date;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
} {
  return {
    timestamp: context.timestamp,
    tenantId: context.tenantId,
    userId: context.userId,
    action,
    resource,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  };
}
