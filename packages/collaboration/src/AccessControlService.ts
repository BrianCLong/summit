/**
 * Access Control and RBAC Service
 * Manages role-based access control, permissions, and data classification
 */

import { v4 as uuidv4 } from 'uuid';

export type ClassificationLevel =
  | 'UNCLASSIFIED'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP_SECRET'
  | 'TS_SCI'; // Top Secret / Sensitive Compartmented Information

export type Permission =
  | 'investigations.create'
  | 'investigations.read'
  | 'investigations.update'
  | 'investigations.delete'
  | 'investigations.assign'
  | 'investigations.approve'
  | 'evidence.create'
  | 'evidence.read'
  | 'evidence.update'
  | 'evidence.delete'
  | 'evidence.download'
  | 'entities.create'
  | 'entities.read'
  | 'entities.update'
  | 'entities.delete'
  | 'entities.merge'
  | 'reports.create'
  | 'reports.read'
  | 'reports.approve'
  | 'reports.publish'
  | 'reports.export'
  | 'alerts.create'
  | 'alerts.read'
  | 'alerts.acknowledge'
  | 'alerts.resolve'
  | 'users.create'
  | 'users.read'
  | 'users.update'
  | 'users.delete'
  | 'users.manage_roles'
  | 'system.admin'
  | 'system.audit'
  | 'system.configure';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  maxClassification: ClassificationLevel;
  isSystemRole: boolean; // Cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[]; // Role IDs
  clearanceLevel: ClassificationLevel;
  organization?: string;
  department?: string;
  needToKnow?: string[]; // Compartments/programs user has access to
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface ResourcePermission {
  resourceType: 'investigation' | 'evidence' | 'entity' | 'report' | 'dashboard';
  resourceId: string;
  userId?: string;
  roleId?: string;
  permissions: Permission[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface CompartmentAccess {
  userId: string;
  compartment: string;
  grantedBy: string;
  grantedAt: Date;
  justification: string;
  expiresAt?: Date;
}

export interface AccessLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: 'read' | 'write' | 'delete' | 'export' | 'share';
  resourceType: string;
  resourceId: string;
  classification?: ClassificationLevel;
  result: 'granted' | 'denied';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AccessControlService {
  private roles: Map<string, Role> = new Map();
  private users: Map<string, User> = new Map();
  private resourcePermissions: Map<string, ResourcePermission[]> = new Map();
  private compartmentAccess: Map<string, CompartmentAccess[]> = new Map();
  private accessLogs: AccessLog[] = [];

  constructor() {
    this.initializeSystemRoles();
  }

  /**
   * Initialize system roles
   */
  private initializeSystemRoles(): void {
    const adminRole: Role = {
      id: 'role-admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        'system.admin',
        'system.audit',
        'system.configure',
        'users.create',
        'users.read',
        'users.update',
        'users.delete',
        'users.manage_roles',
        'investigations.create',
        'investigations.read',
        'investigations.update',
        'investigations.delete',
        'investigations.assign',
        'investigations.approve',
        'evidence.create',
        'evidence.read',
        'evidence.update',
        'evidence.delete',
        'evidence.download',
        'entities.create',
        'entities.read',
        'entities.update',
        'entities.delete',
        'entities.merge',
        'reports.create',
        'reports.read',
        'reports.approve',
        'reports.publish',
        'reports.export',
        'alerts.create',
        'alerts.read',
        'alerts.acknowledge',
        'alerts.resolve',
      ],
      maxClassification: 'TS_SCI',
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const investigatorRole: Role = {
      id: 'role-investigator',
      name: 'Investigator',
      description: 'Lead investigation analyst',
      permissions: [
        'investigations.create',
        'investigations.read',
        'investigations.update',
        'investigations.assign',
        'evidence.create',
        'evidence.read',
        'evidence.update',
        'evidence.download',
        'entities.create',
        'entities.read',
        'entities.update',
        'entities.merge',
        'reports.create',
        'reports.read',
        'reports.export',
        'alerts.read',
        'alerts.acknowledge',
        'alerts.resolve',
      ],
      maxClassification: 'SECRET',
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const analystRole: Role = {
      id: 'role-analyst',
      name: 'Analyst',
      description: 'Intelligence analyst',
      permissions: [
        'investigations.read',
        'investigations.update',
        'evidence.read',
        'evidence.create',
        'entities.create',
        'entities.read',
        'entities.update',
        'reports.create',
        'reports.read',
        'alerts.read',
        'alerts.acknowledge',
      ],
      maxClassification: 'SECRET',
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const viewerRole: Role = {
      id: 'role-viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        'investigations.read',
        'evidence.read',
        'entities.read',
        'reports.read',
        'alerts.read',
      ],
      maxClassification: 'CONFIDENTIAL',
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(adminRole.id, adminRole);
    this.roles.set(investigatorRole.id, investigatorRole);
    this.roles.set(analystRole.id, analystRole);
    this.roles.set(viewerRole.id, viewerRole);
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: Permission): boolean {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return false;

    // Get all permissions from user's roles
    const userPermissions = user.roles.flatMap(roleId => {
      const role = this.roles.get(roleId);
      return role?.permissions || [];
    });

    return userPermissions.includes(permission) || userPermissions.includes('system.admin');
  }

  /**
   * Check if user can access classification level
   */
  canAccessClassification(userId: string, classification: ClassificationLevel): boolean {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return false;

    const levels: ClassificationLevel[] = [
      'UNCLASSIFIED',
      'CONFIDENTIAL',
      'SECRET',
      'TOP_SECRET',
      'TS_SCI',
    ];

    const userLevel = levels.indexOf(user.clearanceLevel);
    const requiredLevel = levels.indexOf(classification);

    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has need-to-know for compartment
   */
  hasNeedToKnow(userId: string, compartment: string): boolean {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return false;

    return user.needToKnow?.includes(compartment) || false;
  }

  /**
   * Grant compartment access
   */
  grantCompartmentAccess(
    userId: string,
    compartment: string,
    grantedBy: string,
    justification: string,
    expiresAt?: Date
  ): CompartmentAccess {
    const access: CompartmentAccess = {
      userId,
      compartment,
      grantedBy,
      grantedAt: new Date(),
      justification,
      expiresAt,
    };

    const userAccess = this.compartmentAccess.get(userId) || [];
    userAccess.push(access);
    this.compartmentAccess.set(userId, userAccess);

    // Update user's need-to-know list
    const user = this.users.get(userId);
    if (user) {
      if (!user.needToKnow) user.needToKnow = [];
      if (!user.needToKnow.includes(compartment)) {
        user.needToKnow.push(compartment);
      }
    }

    return access;
  }

  /**
   * Revoke compartment access
   */
  revokeCompartmentAccess(userId: string, compartment: string): boolean {
    const userAccess = this.compartmentAccess.get(userId);
    if (!userAccess) return false;

    const filtered = userAccess.filter(a => a.compartment !== compartment);
    this.compartmentAccess.set(userId, filtered);

    // Update user's need-to-know list
    const user = this.users.get(userId);
    if (user && user.needToKnow) {
      user.needToKnow = user.needToKnow.filter(c => c !== compartment);
    }

    return true;
  }

  /**
   * Grant resource-specific permission
   */
  grantResourcePermission(permission: Omit<ResourcePermission, 'grantedAt'>): ResourcePermission {
    const fullPermission: ResourcePermission = {
      ...permission,
      grantedAt: new Date(),
    };

    const key = `${permission.resourceType}:${permission.resourceId}`;
    const permissions = this.resourcePermissions.get(key) || [];
    permissions.push(fullPermission);
    this.resourcePermissions.set(key, permissions);

    return fullPermission;
  }

  /**
   * Check resource access
   */
  canAccessResource(
    userId: string,
    resourceType: ResourcePermission['resourceType'],
    resourceId: string,
    permission: Permission
  ): boolean {
    // Check role-based permissions first
    if (this.hasPermission(userId, permission)) {
      return true;
    }

    // Check resource-specific permissions
    const key = `${resourceType}:${resourceId}`;
    const resourcePerms = this.resourcePermissions.get(key) || [];

    return resourcePerms.some(perm => {
      if (perm.userId === userId && perm.permissions.includes(permission)) {
        // Check expiration
        if (perm.expiresAt && perm.expiresAt < new Date()) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  /**
   * Log access attempt
   */
  logAccess(log: Omit<AccessLog, 'id' | 'timestamp'>): void {
    const accessLog: AccessLog = {
      id: uuidv4(),
      timestamp: new Date(),
      ...log,
    };

    this.accessLogs.push(accessLog);

    // In production, would send to audit log storage
    console.log('[ACCESS LOG]', accessLog);
  }

  /**
   * Create user
   */
  createUser(params: {
    email: string;
    name: string;
    roles: string[];
    clearanceLevel: ClassificationLevel;
    organization?: string;
    department?: string;
  }): User {
    const user: User = {
      id: uuidv4(),
      email: params.email,
      name: params.name,
      roles: params.roles,
      clearanceLevel: params.clearanceLevel,
      organization: params.organization,
      department: params.department,
      needToKnow: [],
      isActive: true,
      createdAt: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  /**
   * Create role
   */
  createRole(params: {
    name: string;
    description?: string;
    permissions: Permission[];
    maxClassification: ClassificationLevel;
  }): Role {
    const role: Role = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      permissions: params.permissions,
      maxClassification: params.maxClassification,
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(role.id, role);
    return role;
  }

  /**
   * Get user
   */
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  /**
   * Get role
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get access logs for user
   */
  getAccessLogs(userId: string, limit: number = 100): AccessLog[] {
    return this.accessLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get access logs for resource
   */
  getResourceAccessLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): AccessLog[] {
    return this.accessLogs
      .filter(log => log.resourceType === resourceType && log.resourceId === resourceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export const accessControlService = new AccessControlService();
