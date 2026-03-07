export const PERMISSIONS = {
  READ_GRAPH: "read_graph",
  WRITE_GRAPH: "write_graph",
  RUN_MAESTRO: "run_maestro",
  VIEW_DASHBOARDS: "view_dashboards",
  MANAGE_USERS: "manage_users",
  MANAGE_SETTINGS: "manage_settings",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;
export type Role = "ADMIN" | "ANALYST" | "OPERATOR" | "SERVICE_ACCOUNT" | "VIEWER" | string;

export const PERMISSION_ALIASES: Record<string, Permission> = {
  "entity:create": PERMISSIONS.WRITE_GRAPH,
  "entity:update": PERMISSIONS.WRITE_GRAPH,
  "entity:delete": PERMISSIONS.WRITE_GRAPH,
  "relationship:create": PERMISSIONS.WRITE_GRAPH,
  "relationship:update": PERMISSIONS.WRITE_GRAPH,
  "relationship:delete": PERMISSIONS.WRITE_GRAPH,
  "graph:read": PERMISSIONS.READ_GRAPH,
  "graph:export": PERMISSIONS.READ_GRAPH,
  "action:read": PERMISSIONS.READ_GRAPH,
  "action:view": PERMISSIONS.READ_GRAPH,
  "actions:list": PERMISSIONS.READ_GRAPH,
  "actions:read": PERMISSIONS.READ_GRAPH,
  "run:create": PERMISSIONS.RUN_MAESTRO,
  "run:read": PERMISSIONS.RUN_MAESTRO,
  "run:update": PERMISSIONS.RUN_MAESTRO,
  "admin:access": PERMISSIONS.MANAGE_USERS,
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["*"],
  ANALYST: [
    PERMISSIONS.READ_GRAPH,
    PERMISSIONS.WRITE_GRAPH,
    PERMISSIONS.VIEW_DASHBOARDS,
    "graph:read",
    "graph:export",
    "ai:request",
  ],
  OPERATOR: [
    PERMISSIONS.READ_GRAPH,
    PERMISSIONS.RUN_MAESTRO,
    PERMISSIONS.VIEW_DASHBOARDS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  SERVICE_ACCOUNT: [PERMISSIONS.READ_GRAPH, PERMISSIONS.WRITE_GRAPH],
  VIEWER: [PERMISSIONS.READ_GRAPH, "graph:read", "graph:export"],
};

export function normalizePermission(permission: Permission): Permission | null {
  if (!permission) return null;
  const lower = permission.toString().toLowerCase();

  const canonical = Object.values(PERMISSIONS).find((candidate) => candidate === lower);
  if (canonical) return canonical;

  const alias = PERMISSION_ALIASES[permission] || PERMISSION_ALIASES[lower];
  if (alias) return alias;

  return permission;
}

export function permissionsForRole(role?: string | null): Permission[] {
  if (!role) return [];
  const normalizedRole = role.toUpperCase();
  return ROLE_PERMISSIONS[normalizedRole] || [];
}

export function hasCapability(
  user: { role?: string; permissions?: Permission[] } | undefined,
  permission: Permission
): boolean {
  if (!user?.role) return false;
  if (user.role.toUpperCase() === "ADMIN") return true;

  const normalized = normalizePermission(permission);
  if (!normalized) return false;

  if (user.permissions?.includes("*")) return true;

  const explicitMatches = (user.permissions || [])
    .map((perm) => normalizePermission(perm))
    .filter(Boolean) as Permission[];
  if (explicitMatches.includes(normalized)) return true;

  const byRole = permissionsForRole(user.role);
  return byRole.includes("*") || byRole.includes(normalized);
}
