import { GraphQLError } from 'graphql';
import { getRbacService } from '../../services/rbac/RbacService.js';

const rbacService = getRbacService();

const MANAGE_PERMISSION = 'rbac.manage';

function requireUser(context: any) {
  if (!context?.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

function userHasPermission(user: any, permission: string): boolean {
  const permissions = (user?.permissions || []).map((perm: string) => perm.toLowerCase());
  if (permissions.includes('*')) {
    return true;
  }
  const normalized = permission.toLowerCase();
  if (permissions.includes(normalized)) {
    return true;
  }
  return permissions.some(
    (perm: string) => perm.endsWith('.*') && normalized.startsWith(perm.substring(0, perm.length - 2)),
  );
}

function requireManagePermission(context: any): void {
  const user = requireUser(context);
  if (!userHasPermission(user, MANAGE_PERMISSION)) {
    throw new GraphQLError('RBAC management permission required', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

export const rbacResolvers = {
  Query: {
    rbacRoles: async (_: unknown, __: unknown, context: any) => {
      requireManagePermission(context);
      return rbacService.listRoles();
    },
    rbacRole: async (_: unknown, args: { id: string }, context: any) => {
      requireManagePermission(context);
      return rbacService.getRoleById(args.id);
    },
    rbacPermissions: async (_: unknown, __: unknown, context: any) => {
      requireManagePermission(context);
      return rbacService.listPermissions();
    },
    rbacPolicyVersion: async (_: unknown, __: unknown, context: any) => {
      requireManagePermission(context);
      const { version, updatedAt } = await rbacService.getLatestVersion();
      return { version, updatedAt };
    },
  },
  Mutation: {
    createRbacPermission: async (
      _: unknown,
      args: { input: { name: string; description?: string; category?: string } },
      context: any,
    ) => {
      requireManagePermission(context);
      return rbacService.createPermission(args.input);
    },
    updateRbacPermission: async (
      _: unknown,
      args: { id: string; input: { description?: string; category?: string } },
      context: any,
    ) => {
      requireManagePermission(context);
      return rbacService.updatePermission(args.id, args.input);
    },
    deleteRbacPermission: async (_: unknown, args: { id: string }, context: any) => {
      requireManagePermission(context);
      return rbacService.deletePermission(args.id);
    },
    createRbacRole: async (
      _: unknown,
      args: { input: { name: string; description?: string; isSystem?: boolean; permissionIds?: string[] } },
      context: any,
    ) => {
      requireManagePermission(context);
      return rbacService.createRole(args.input);
    },
    updateRbacRole: async (
      _: unknown,
      args: { id: string; input: { name?: string; description?: string; isSystem?: boolean; permissionIds?: string[] } },
      context: any,
    ) => {
      requireManagePermission(context);
      return rbacService.updateRole({ id: args.id, ...args.input });
    },
    deleteRbacRole: async (_: unknown, args: { id: string }, context: any) => {
      requireManagePermission(context);
      return rbacService.deleteRole(args.id);
    },
    assignRoleToUser: async (_: unknown, args: { roleId: string; userId: string }, context: any) => {
      requireManagePermission(context);
      await rbacService.assignRoleToUser(args.userId, args.roleId, context?.user?.id);
      const role = await rbacService.getRoleById(args.roleId);
      const assignment = await rbacService.getRoleAssignment(args.userId, args.roleId);
      return {
        role,
        userId: args.userId,
        assignedAt: assignment?.assignedAt ?? new Date(),
      };
    },
    removeRoleFromUser: async (_: unknown, args: { roleId: string; userId: string }, context: any) => {
      requireManagePermission(context);
      return rbacService.removeRoleFromUser(args.userId, args.roleId);
    },
    publishRbacPolicy: async (_: unknown, args: { note?: string | null }, context: any) => {
      requireManagePermission(context);
      const { version, createdAt, note } = await rbacService.publishVersion(args.note ?? undefined);
      return { version, updatedAt: createdAt, note };
    },
  },
  RbacRole: {
    permissions: async (role: any) => {
      if (role.permissions) {
        return role.permissions;
      }
      const fresh = await rbacService.getRoleById(role.id);
      return fresh?.permissions ?? [];
    },
  },
  RbacRoleAssignment: {
    role: (assignment: any) => assignment.role,
    assignedAt: (assignment: any) => assignment.assignedAt,
  },
};

export default rbacResolvers;
