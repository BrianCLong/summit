export type IsolationBoundary = "tenant" | "compartment";

export interface TenantScope {
  tenantId: string;
  compartments?: string[];
  label?: string;
}

export interface IsolationContext {
  tenant: TenantScope;
  actorId?: string;
  service?: string;
}

export class IsolationViolationError extends Error {
  readonly boundary: IsolationBoundary;
  readonly details?: Record<string, unknown>;

  constructor(message: string, boundary: IsolationBoundary, details?: Record<string, unknown>) {
    super(message);
    this.name = "IsolationViolationError";
    this.boundary = boundary;
    this.details = details;
  }
}

export const requireTenantScope = (scope: Partial<TenantScope>): TenantScope => {
  if (!scope?.tenantId) {
    throw new IsolationViolationError("Tenant scope is required for this operation.", "tenant");
  }

  return {
    tenantId: scope.tenantId,
    compartments: scope.compartments ?? [],
    label: scope.label,
  };
};

export const assertTenantMatch = (
  targetTenantId: string | undefined,
  scope: TenantScope,
  hint?: string
): void => {
  const tenantScope = requireTenantScope(scope);

  if (!targetTenantId || targetTenantId !== tenantScope.tenantId) {
    throw new IsolationViolationError(
      `Tenant boundary violation: expected ${tenantScope.tenantId} but received ${targetTenantId ?? "unknown"}.`,
      "tenant",
      hint ? { hint } : undefined
    );
  }
};

export const scopeSqlToTenant = (
  query: string,
  params: unknown[],
  scope: TenantScope,
  column = "tenant_id"
): { text: string; values: unknown[] } => {
  const tenantScope = requireTenantScope(scope);
  const normalizedQuery = query.trim();
  const lower = normalizedQuery.toLowerCase();
  const lowerColumn = column.toLowerCase();

  const whereIndex = lower.indexOf(" where ");
  const hasTenantGuard =
    (whereIndex !== -1 && lower.slice(whereIndex).includes(lowerColumn)) ||
    new RegExp(`\\b${lowerColumn}\\b`).test(lower);

  if (hasTenantGuard) {
    return { text: normalizedQuery, values: params };
  }

  const clauseMatch = lower.match(
    /\s(group by|order by|limit|offset|returning|having|for update|for share)\b/
  );
  const insertionIndex = clauseMatch?.index ?? normalizedQuery.length;
  const before = normalizedQuery.slice(0, insertionIndex).trimEnd();
  const after = normalizedQuery.slice(insertionIndex);
  const values = [...params, tenantScope.tenantId];
  const paramIndex = values.length;

  const connector =
    whereIndex !== -1 && whereIndex < insertionIndex
      ? ` AND ${column} = $${paramIndex}`
      : ` WHERE ${column} = $${paramIndex}`;
  const text = `${before}${connector}${after}`;

  return { text, values };
};

export const enforceCompartments = (
  targetCompartments: string[] | readonly string[],
  scope: TenantScope,
  options: { allowUnscoped?: boolean } = {}
): void => {
  const compartments = [...targetCompartments];

  if (compartments.length === 0) {
    if (options.allowUnscoped) return;
    throw new IsolationViolationError(
      "Compartment boundary requires explicit labels.",
      "compartment"
    );
  }

  const allowed = new Set(scope.compartments ?? []);
  const missing = compartments.filter((compartment) => !allowed.has(compartment));

  if (missing.length > 0) {
    throw new IsolationViolationError("Compartment boundary violation detected.", "compartment", {
      missing,
      allowed: Array.from(allowed),
    });
  }
};

export const assertServiceIsolation = (
  context: IsolationContext,
  resource: { tenantId?: string; compartments?: string[] },
  options: { requireCompartments?: boolean; tenantColumn?: string } = {}
): void => {
  const tenantScope = requireTenantScope(context.tenant);
  assertTenantMatch(resource.tenantId, tenantScope, options.tenantColumn);

  if (options.requireCompartments) {
    enforceCompartments(resource.compartments ?? [], tenantScope);
  } else if (resource.compartments && resource.compartments.length > 0) {
    enforceCompartments(resource.compartments, tenantScope, { allowUnscoped: true });
  }
};

export const createTenantScopedParams = (
  scope: TenantScope,
  baseParams: Record<string, unknown> = {}
): Record<string, unknown> => {
  const tenantScope = requireTenantScope(scope);
  return {
    ...baseParams,
    tenantId: tenantScope.tenantId,
    compartments: tenantScope.compartments ?? [],
  };
};
