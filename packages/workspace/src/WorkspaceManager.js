"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceManager = void 0;
const nanoid_1 = require("nanoid");
const types_1 = require("./types");
class WorkspaceManager {
    store;
    constructor(store) {
        this.store = store;
    }
    // Workspace management
    async createWorkspace(name, ownerId, options) {
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
                defaultMemberRole: types_1.WorkspaceRole.MEMBER,
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
            role: types_1.WorkspaceRole.OWNER,
            permissions: Object.values(types_1.ResourcePermission)
        });
        await this.store.logActivity({
            workspaceId: workspace.id,
            userId: ownerId,
            action: 'workspace.created',
            metadata: { workspaceName: name }
        });
        return workspace;
    }
    async inviteMember(workspaceId, email, role, invitedBy) {
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
    async acceptInvitation(token, userId) {
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
    async checkPermission(context, requiredPermission) {
        const member = await this.store.getMember(context.workspaceId, context.userId);
        if (!member) {
            return {
                granted: false,
                reason: 'User is not a member of this workspace'
            };
        }
        // Owner and Admin have all permissions
        if (member.role === types_1.WorkspaceRole.OWNER || member.role === types_1.WorkspaceRole.ADMIN) {
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
    async hasRole(workspaceId, userId, minimumRole) {
        const member = await this.store.getMember(workspaceId, userId);
        if (!member)
            return false;
        const roleHierarchy = {
            [types_1.WorkspaceRole.OWNER]: 5,
            [types_1.WorkspaceRole.ADMIN]: 4,
            [types_1.WorkspaceRole.MEMBER]: 3,
            [types_1.WorkspaceRole.VIEWER]: 2,
            [types_1.WorkspaceRole.GUEST]: 1
        };
        return roleHierarchy[member.role] >= roleHierarchy[minimumRole];
    }
    // Project management
    async createProject(workspaceId, name, ownerId, options) {
        // Check permissions
        const permCheck = await this.checkPermission({ userId: ownerId, workspaceId }, types_1.ResourcePermission.WRITE);
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
                defaultPermissions: [types_1.ResourcePermission.READ]
            }
        });
        // Add owner as admin
        await this.store.addProjectMember({
            projectId: project.id,
            userId: ownerId,
            role: types_1.WorkspaceRole.ADMIN,
            permissions: Object.values(types_1.ResourcePermission),
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
    async addProjectMember(projectId, userId, role, addedBy) {
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
    async getWorkspaceMetrics(workspaceId) {
        const [members, projects, activities] = await Promise.all([
            this.store.listMembers(workspaceId),
            this.store.listProjects(workspaceId),
            this.store.getActivities(workspaceId, 100)
        ]);
        const activeMembers = members.filter(m => {
            if (!m.lastActiveAt)
                return false;
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
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + (0, nanoid_1.nanoid)(8);
    }
    getDefaultPermissionsForRole(role) {
        switch (role) {
            case types_1.WorkspaceRole.OWNER:
            case types_1.WorkspaceRole.ADMIN:
                return Object.values(types_1.ResourcePermission);
            case types_1.WorkspaceRole.MEMBER:
                return [types_1.ResourcePermission.READ, types_1.ResourcePermission.WRITE, types_1.ResourcePermission.SHARE];
            case types_1.WorkspaceRole.VIEWER:
                return [types_1.ResourcePermission.READ];
            case types_1.WorkspaceRole.GUEST:
                return [types_1.ResourcePermission.READ];
            default:
                return [types_1.ResourcePermission.READ];
        }
    }
    groupBy(array, key) {
        return array.reduce((acc, item) => {
            const groupKey = String(item[key]);
            acc[groupKey] = (acc[groupKey] || 0) + 1;
            return acc;
        }, {});
    }
}
exports.WorkspaceManager = WorkspaceManager;
