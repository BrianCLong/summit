import { nanoid } from 'nanoid';
import {
  Workspace,
  WorkspaceMember,
  Project,
  ProjectMember,
  WorkspaceInvitation,
  WorkspaceTemplate,
  WorkspaceActivity,
  WorkspaceRole,
  ResourcePermission,
  PermissionContext,
  PermissionCheck
} from './types';

export interface WorkspaceStore {
  // Workspace operations
  createWorkspace(workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace>;
  getWorkspace(id: string): Promise<Workspace | null>;
  getWorkspaceBySlug(slug: string): Promise<Workspace | null>;
  updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;
  listWorkspaces(userId: string): Promise<Workspace[]>;

  // Member operations
  addMember(member: Omit<WorkspaceMember, 'id' | 'joinedAt'>): Promise<WorkspaceMember>;
  getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  listMembers(workspaceId: string): Promise<WorkspaceMember[]>;

  // Project operations
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  getProject(id: string): Promise<Project | null>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  listProjects(workspaceId: string): Promise<Project[]>;

  // Project member operations
  addProjectMember(member: Omit<ProjectMember, 'id' | 'addedAt'>): Promise<ProjectMember>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;
  listProjectMembers(projectId: string): Promise<ProjectMember[]>;

  // Invitation operations
  createInvitation(invitation: Omit<WorkspaceInvitation, 'id' | 'createdAt' | 'token'>): Promise<WorkspaceInvitation>;
  getInvitation(token: string): Promise<WorkspaceInvitation | null>;
  acceptInvitation(token: string, userId: string): Promise<WorkspaceMember>;
  listInvitations(workspaceId: string): Promise<WorkspaceInvitation[]>;

  // Activity operations
  logActivity(activity: Omit<WorkspaceActivity, 'id' | 'createdAt'>): Promise<WorkspaceActivity>;
  getActivities(workspaceId: string, limit?: number): Promise<WorkspaceActivity[]>;
}

export class WorkspaceManager {
  constructor(private store: WorkspaceStore) {}

  // Workspace management
  async createWorkspace(
    name: string,
    ownerId: string,
    options?: {
      description?: string;
      slug?: string;
      organizationId?: string;
      template?: string;
    }
  ): Promise<Workspace> {
    const slug = options?.slug || this.generateSlug(name);

    const workspace = await this.store.createWorkspace({
      name,
      slug,
      description: options?.description,
      ownerId,
      organizationId: options?.organizationId,
      settings: {
        isPublic: false,
        allowGuestAccess: false,
        defaultMemberRole: WorkspaceRole.MEMBER,
        features: {
          realTimeCollaboration: true,
          versionControl: true,
          commenting: true,
          taskManagement: true,
          knowledgeBase: true,
          videoConferencing: false,
          marketplace: false
        }
      }
    });

    // Add owner as admin
    await this.store.addMember({
      workspaceId: workspace.id,
      userId: ownerId,
      role: WorkspaceRole.OWNER,
      permissions: Object.values(ResourcePermission)
    });

    await this.store.logActivity({
      workspaceId: workspace.id,
      userId: ownerId,
      action: 'workspace.created',
      metadata: { workspaceName: name }
    });

    return workspace;
  }

  async inviteMember(
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    invitedBy: string
  ): Promise<WorkspaceInvitation> {
    const invitation = await this.store.createInvitation({
      workspaceId,
      email,
      role,
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await this.store.logActivity({
      workspaceId,
      userId: invitedBy,
      action: 'member.added',
      metadata: { email, role }
    });

    return invitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<WorkspaceMember> {
    const member = await this.store.acceptInvitation(token, userId);

    await this.store.logActivity({
      workspaceId: member.workspaceId,
      userId,
      action: 'member.added',
      metadata: { userId }
    });

    return member;
  }

  // Permission management
  async checkPermission(
    context: PermissionContext,
    requiredPermission: ResourcePermission
  ): Promise<PermissionCheck> {
    const member = await this.store.getMember(context.workspaceId, context.userId);

    if (!member) {
      return {
        granted: false,
        reason: 'User is not a member of this workspace'
      };
    }

    // Owner and Admin have all permissions
    if (member.role === WorkspaceRole.OWNER || member.role === WorkspaceRole.ADMIN) {
      return { granted: true };
    }

    // Check if member has the required permission
    if (member.permissions.includes(requiredPermission)) {
      return { granted: true };
    }

    // Check custom permissions
    if (member.customPermissions?.[requiredPermission]) {
      return { granted: true };
    }

    return {
      granted: false,
      reason: 'Insufficient permissions',
      requiredPermission
    };
  }

  async hasRole(
    workspaceId: string,
    userId: string,
    minimumRole: WorkspaceRole
  ): Promise<boolean> {
    const member = await this.store.getMember(workspaceId, userId);
    if (!member) return false;

    const roleHierarchy = {
      [WorkspaceRole.OWNER]: 5,
      [WorkspaceRole.ADMIN]: 4,
      [WorkspaceRole.MEMBER]: 3,
      [WorkspaceRole.VIEWER]: 2,
      [WorkspaceRole.GUEST]: 1
    };

    return roleHierarchy[member.role] >= roleHierarchy[minimumRole];
  }

  // Project management
  async createProject(
    workspaceId: string,
    name: string,
    ownerId: string,
    options?: {
      description?: string;
      color?: string;
      icon?: string;
      isPrivate?: boolean;
    }
  ): Promise<Project> {
    // Check permissions
    const permCheck = await this.checkPermission(
      { userId: ownerId, workspaceId },
      ResourcePermission.WRITE
    );

    if (!permCheck.granted) {
      throw new Error('Insufficient permissions to create project');
    }

    const slug = this.generateSlug(name);
    const project = await this.store.createProject({
      workspaceId,
      name,
      slug,
      description: options?.description,
      color: options?.color,
      icon: options?.icon,
      ownerId,
      settings: {
        isPrivate: options?.isPrivate || false,
        requireApproval: false,
        defaultPermissions: [ResourcePermission.READ]
      }
    });

    // Add owner as admin
    await this.store.addProjectMember({
      projectId: project.id,
      userId: ownerId,
      role: WorkspaceRole.ADMIN,
      permissions: Object.values(ResourcePermission),
      addedBy: ownerId
    });

    await this.store.logActivity({
      workspaceId,
      userId: ownerId,
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { projectName: name }
    });

    return project;
  }

  async addProjectMember(
    projectId: string,
    userId: string,
    role: WorkspaceRole,
    addedBy: string
  ): Promise<ProjectMember> {
    const project = await this.store.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const member = await this.store.addProjectMember({
      projectId,
      userId,
      role,
      permissions: this.getDefaultPermissionsForRole(role),
      addedBy
    });

    await this.store.logActivity({
      workspaceId: project.workspaceId,
      userId: addedBy,
      action: 'member.added',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { userId, role }
    });

    return member;
  }

  // Analytics
  async getWorkspaceMetrics(workspaceId: string) {
    const [members, projects, activities] = await Promise.all([
      this.store.listMembers(workspaceId),
      this.store.listProjects(workspaceId),
      this.store.getActivities(workspaceId, 100)
    ]);

    const activeMembers = members.filter(m => {
      if (!m.lastActiveAt) return false;
      const daysSinceActive = (Date.now() - m.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActive <= 7;
    });

    return {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      totalProjects: projects.length,
      activeProjects: projects.filter(p => !p.archivedAt).length,
      recentActivityCount: activities.length,
      membersByRole: this.groupBy(members, 'role')
    };
  }

  // Helper methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + nanoid(8);
  }

  private getDefaultPermissionsForRole(role: WorkspaceRole): ResourcePermission[] {
    switch (role) {
      case WorkspaceRole.OWNER:
      case WorkspaceRole.ADMIN:
        return Object.values(ResourcePermission);
      case WorkspaceRole.MEMBER:
        return [ResourcePermission.READ, ResourcePermission.WRITE, ResourcePermission.SHARE];
      case WorkspaceRole.VIEWER:
        return [ResourcePermission.READ];
      case WorkspaceRole.GUEST:
        return [ResourcePermission.READ];
      default:
        return [ResourcePermission.READ];
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const groupKey = String(item[key]);
      acc[groupKey] = (acc[groupKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
