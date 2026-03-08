"use strict";
/**
 * Safe Analytics Workbench - Workspace Service
 *
 * Core service for managing analytics workspaces including CRUD operations,
 * lifecycle management, and collaboration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const events_1 = require("events");
const types_1 = require("../models/types");
const governance_1 = require("../models/governance");
const logger_1 = require("../utils/logger");
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_SERVICE_CONFIG = {
    maxWorkspacesPerUser: {
        [types_1.UserRole.ANALYST]: 3,
        [types_1.UserRole.DATA_SCIENTIST]: 5,
        [types_1.UserRole.ENGINEER]: 10,
        [types_1.UserRole.AUDITOR]: 2,
        [types_1.UserRole.WORKSPACE_OWNER]: 5,
    },
    autoApprovalTypes: [types_1.WorkspaceType.AD_HOC],
    defaultIdleTimeoutHours: 24,
    sandboxEnabled: true,
};
// ============================================================================
// Workspace Service Implementation
// ============================================================================
class WorkspaceService extends events_1.EventEmitter {
    repository;
    approvalService;
    auditService;
    sandboxManager;
    config;
    constructor(repository, approvalService, auditService, sandboxManager, config = DEFAULT_SERVICE_CONFIG) {
        super();
        this.repository = repository;
        this.approvalService = approvalService;
        this.auditService = auditService;
        this.sandboxManager = sandboxManager;
        this.config = config;
    }
    /**
     * Create a new analytics workspace
     */
    async createWorkspace(input, context) {
        logger_1.logger.info('Creating workspace', { name: input.name, type: input.type, userId: context.userId });
        // Validate user can create workspace
        await this.validateWorkspaceCreation(input, context);
        // Build workspace configuration
        const workspaceConfig = this.buildWorkspaceConfig(input, context);
        // Create workspace entity
        const workspace = {
            id: this.generateWorkspaceId(),
            name: input.name,
            description: input.description,
            type: input.type,
            status: types_1.WorkspaceStatus.PENDING,
            ownerId: context.userId,
            tenantId: context.tenantId,
            config: workspaceConfig,
            datasetAccess: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            queryCount: 0,
            exportCount: 0,
            computeHoursUsed: 0,
            storageUsedBytes: 0,
            tags: input.tags || [],
            metadata: input.metadata || {},
        };
        // Calculate expiration
        const ttlHours = types_1.DEFAULT_TTL_HOURS[input.type];
        workspace.expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
        // Save workspace
        await this.repository.save(workspace);
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.WORKSPACE_CREATE,
            resourceType: 'WORKSPACE',
            resourceId: workspace.id,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId: workspace.id,
            ...context,
            parameters: { input },
        });
        // Check if approval required
        if (this.config.autoApprovalTypes.includes(input.type)) {
            // Auto-approve
            workspace.status = types_1.WorkspaceStatus.ACTIVE;
            await this.repository.save(workspace);
            // Provision sandbox if enabled
            if (this.config.sandboxEnabled) {
                await this.sandboxManager.createSandbox(workspace);
            }
        }
        else {
            // Create approval request
            const approvalRequest = await this.approvalService.createRequest({
                type: governance_1.ApprovalType.WORKSPACE_CREATION,
                workspaceId: workspace.id,
                tenantId: context.tenantId,
                requestorId: context.userId,
                requestorRole: context.userRole,
                justification: input.justification,
                metadata: { workspaceType: input.type },
            });
            workspace.approvalId = approvalRequest.id;
            await this.repository.save(workspace);
        }
        this.emit('workspace:created', workspace);
        return workspace;
    }
    /**
     * Get workspace by ID
     */
    async getWorkspace(workspaceId, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            return null;
        }
        // Check access
        await this.validateWorkspaceAccess(workspace, context, 'VIEW');
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.WORKSPACE_ACCESS,
            resourceType: 'WORKSPACE',
            resourceId: workspaceId,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId,
            ...context,
            parameters: {},
        });
        return workspace;
    }
    /**
     * List workspaces with filtering and pagination
     */
    async listWorkspaces(filter, pagination, context) {
        // Apply tenant filter
        filter.tenantIds = [context.tenantId];
        // Non-admin users can only see their own workspaces or shared ones
        if (context.userRole !== types_1.UserRole.ENGINEER) {
            filter.ownerIds = [context.userId];
        }
        return this.repository.findMany(filter, pagination);
    }
    /**
     * Update workspace
     */
    async updateWorkspace(workspaceId, input, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }
        await this.validateWorkspaceAccess(workspace, context, 'MANAGE');
        // Apply updates
        if (input.name)
            workspace.name = input.name;
        if (input.description !== undefined)
            workspace.description = input.description;
        if (input.tags)
            workspace.tags = input.tags;
        if (input.metadata)
            workspace.metadata = { ...workspace.metadata, ...input.metadata };
        // Apply resource overrides if provided
        if (input.resourceOverrides) {
            workspace.config.resources = {
                ...workspace.config.resources,
                ...input.resourceOverrides,
            };
        }
        workspace.updatedAt = new Date();
        await this.repository.save(workspace);
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.WORKSPACE_UPDATE,
            resourceType: 'WORKSPACE',
            resourceId: workspaceId,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId,
            ...context,
            parameters: { input },
        });
        this.emit('workspace:updated', workspace);
        return workspace;
    }
    /**
     * Archive workspace
     */
    async archiveWorkspace(workspaceId, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }
        await this.validateWorkspaceAccess(workspace, context, 'MANAGE');
        // Stop sandbox
        if (this.config.sandboxEnabled) {
            await this.sandboxManager.stopSandbox(workspaceId, 'Workspace archived');
        }
        workspace.status = types_1.WorkspaceStatus.ARCHIVED;
        workspace.archivedAt = new Date();
        workspace.updatedAt = new Date();
        await this.repository.save(workspace);
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.WORKSPACE_ARCHIVE,
            resourceType: 'WORKSPACE',
            resourceId: workspaceId,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId,
            ...context,
            parameters: {},
        });
        this.emit('workspace:archived', workspace);
        return workspace;
    }
    /**
     * Delete workspace
     */
    async deleteWorkspace(workspaceId, reason, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }
        await this.validateWorkspaceAccess(workspace, context, 'DELETE');
        // Stop sandbox
        if (this.config.sandboxEnabled) {
            await this.sandboxManager.stopSandbox(workspaceId, 'Workspace deleted');
        }
        workspace.status = types_1.WorkspaceStatus.DELETED;
        workspace.deletedAt = new Date();
        workspace.updatedAt = new Date();
        await this.repository.save(workspace);
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.WORKSPACE_DELETE,
            resourceType: 'WORKSPACE',
            resourceId: workspaceId,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId,
            ...context,
            parameters: { reason },
        });
        this.emit('workspace:deleted', workspace);
    }
    /**
     * Suspend workspace due to policy violation or extended idle
     */
    async suspendWorkspace(workspaceId, reason, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }
        // Stop sandbox
        if (this.config.sandboxEnabled) {
            await this.sandboxManager.stopSandbox(workspaceId, reason);
        }
        workspace.status = types_1.WorkspaceStatus.SUSPENDED;
        workspace.suspensionReason = reason;
        workspace.updatedAt = new Date();
        await this.repository.save(workspace);
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.WORKSPACE_SUSPEND,
            resourceType: 'WORKSPACE',
            resourceId: workspaceId,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId,
            ...context,
            parameters: { reason },
        });
        this.emit('workspace:suspended', workspace);
        return workspace;
    }
    /**
     * Reactivate a suspended workspace (requires approval)
     */
    async reactivateWorkspace(workspaceId, justification, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }
        if (workspace.status !== types_1.WorkspaceStatus.SUSPENDED) {
            throw new Error(`Workspace is not suspended: ${workspaceId}`);
        }
        await this.validateWorkspaceAccess(workspace, context, 'MANAGE');
        // Create approval request for reactivation
        const approvalRequest = await this.approvalService.createRequest({
            type: governance_1.ApprovalType.REACTIVATION,
            workspaceId: workspace.id,
            tenantId: context.tenantId,
            requestorId: context.userId,
            requestorRole: context.userRole,
            justification,
            metadata: {
                suspensionReason: workspace.suspensionReason,
            },
        });
        return approvalRequest;
    }
    /**
     * Record activity on workspace (extends idle timeout)
     */
    async recordActivity(workspaceId) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            return;
        }
        // If workspace was IDLE, reactivate it
        if (workspace.status === types_1.WorkspaceStatus.IDLE) {
            workspace.status = types_1.WorkspaceStatus.ACTIVE;
        }
        workspace.lastActivityAt = new Date();
        workspace.updatedAt = new Date();
        await this.repository.save(workspace);
    }
    /**
     * Add collaborator to workspace
     */
    async addCollaborator(workspaceId, collaborator, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }
        await this.validateWorkspaceAccess(workspace, context, 'INVITE');
        const newCollaborator = {
            userId: collaborator.userId,
            role: collaborator.role,
            permissions: collaborator.permissions,
            addedAt: new Date(),
            addedBy: context.userId,
        };
        await this.repository.addCollaborator(workspaceId, newCollaborator);
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.COLLABORATOR_ADD,
            resourceType: 'COLLABORATOR',
            resourceId: collaborator.userId,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId,
            ...context,
            parameters: { collaborator },
        });
        this.emit('workspace:collaborator-added', { workspace, collaborator: newCollaborator });
        return newCollaborator;
    }
    /**
     * Remove collaborator from workspace
     */
    async removeCollaborator(workspaceId, userId, context) {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }
        await this.validateWorkspaceAccess(workspace, context, 'INVITE');
        await this.repository.removeCollaborator(workspaceId, userId);
        // Audit log
        await this.auditService.log({
            action: governance_1.AuditAction.COLLABORATOR_REMOVE,
            resourceType: 'COLLABORATOR',
            resourceId: userId,
            result: governance_1.AuditResult.SUCCESS,
            workspaceId,
            ...context,
            parameters: { removedUserId: userId },
        });
        this.emit('workspace:collaborator-removed', { workspaceId, userId });
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    async validateWorkspaceCreation(input, context) {
        // Check workspace quota
        const existingWorkspaces = await this.repository.countByOwner(context.userId);
        const maxAllowed = this.config.maxWorkspacesPerUser[context.userRole];
        if (existingWorkspaces >= maxAllowed) {
            throw new Error(`Workspace quota exceeded. Maximum ${maxAllowed} workspaces allowed for role ${context.userRole}`);
        }
        // Check workspace type permission
        if (input.type === types_1.WorkspaceType.MODEL_DEVELOPMENT &&
            context.userRole === types_1.UserRole.ANALYST) {
            throw new Error('Analysts cannot create MODEL_DEVELOPMENT workspaces');
        }
    }
    async validateWorkspaceAccess(workspace, context, permission) {
        // Owner has full access
        if (workspace.ownerId === context.userId) {
            return;
        }
        // Engineers have admin access
        if (context.userRole === types_1.UserRole.ENGINEER) {
            return;
        }
        // Check collaborator permissions
        const collaborator = await this.repository.getCollaborator(workspace.id, context.userId);
        if (!collaborator) {
            throw new Error(`Access denied to workspace: ${workspace.id}`);
        }
        const requiredPermission = this.mapPermission(permission);
        if (!collaborator.permissions.includes(requiredPermission)) {
            throw new Error(`Insufficient permissions for ${permission} on workspace: ${workspace.id}`);
        }
    }
    mapPermission(permission) {
        const mapping = {
            VIEW: types_1.CollaboratorPermission.VIEW,
            QUERY: types_1.CollaboratorPermission.QUERY,
            EXPORT: types_1.CollaboratorPermission.EXPORT,
            MANAGE: types_1.CollaboratorPermission.ADMIN,
            INVITE: types_1.CollaboratorPermission.INVITE,
            DELETE: types_1.CollaboratorPermission.ADMIN,
        };
        return mapping[permission];
    }
    buildWorkspaceConfig(input, context) {
        const defaultResources = types_1.DEFAULT_RESOURCE_CONFIGS[input.type];
        const resources = input.resourceOverrides
            ? { ...defaultResources, ...input.resourceOverrides }
            : defaultResources;
        const egressPolicy = types_1.DEFAULT_EGRESS_POLICIES[context.userRole];
        return {
            resources,
            idleTimeoutHours: this.config.defaultIdleTimeoutHours,
            archiveAfterIdleDays: 30,
            retentionDays: 90,
            autoExtend: true,
            egressPolicy,
        };
    }
    generateWorkspaceId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `ws-${timestamp}-${random}`;
    }
}
exports.WorkspaceService = WorkspaceService;
