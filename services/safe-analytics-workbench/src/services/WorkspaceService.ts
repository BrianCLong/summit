/**
 * Safe Analytics Workbench - Workspace Service
 *
 * Core service for managing analytics workspaces including CRUD operations,
 * lifecycle management, and collaboration.
 */

import { EventEmitter } from 'events';
import {
  Workspace,
  WorkspaceType,
  WorkspaceStatus,
  WorkspaceConfig,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceFilter,
  Pagination,
  PaginatedResult,
  WorkspaceCollaborator,
  CollaboratorPermission,
  UserRole,
  DEFAULT_RESOURCE_CONFIGS,
  DEFAULT_TTL_HOURS,
  DEFAULT_EGRESS_POLICIES,
} from '../models/types';
import {
  ApprovalRequest,
  ApprovalType,
  ApprovalStatus,
  AuditAction,
  AuditEvent,
  AuditResult,
  DEFAULT_APPROVAL_WORKFLOWS,
} from '../models/governance';
import { SandboxManager } from '../sandbox/SandboxManager';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceServiceConfig {
  /** Maximum workspaces per user by role */
  maxWorkspacesPerUser: Record<UserRole, number>;

  /** Auto-approval for certain workspace types */
  autoApprovalTypes: WorkspaceType[];

  /** Default idle timeout hours */
  defaultIdleTimeoutHours: number;

  /** Enable sandbox provisioning */
  sandboxEnabled: boolean;
}

export interface WorkspaceContext {
  userId: string;
  userRole: UserRole;
  tenantId: string;
  clientIp: string;
  sessionId?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SERVICE_CONFIG: WorkspaceServiceConfig = {
  maxWorkspacesPerUser: {
    [UserRole.ANALYST]: 3,
    [UserRole.DATA_SCIENTIST]: 5,
    [UserRole.ENGINEER]: 10,
    [UserRole.AUDITOR]: 2,
    [UserRole.WORKSPACE_OWNER]: 5,
  },
  autoApprovalTypes: [WorkspaceType.AD_HOC],
  defaultIdleTimeoutHours: 24,
  sandboxEnabled: true,
};

// ============================================================================
// Workspace Service Implementation
// ============================================================================

export class WorkspaceService extends EventEmitter {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly approvalService: ApprovalService,
    private readonly auditService: AuditService,
    private readonly sandboxManager: SandboxManager,
    private readonly config: WorkspaceServiceConfig = DEFAULT_SERVICE_CONFIG
  ) {
    super();
  }

  /**
   * Create a new analytics workspace
   */
  async createWorkspace(
    input: CreateWorkspaceInput,
    context: WorkspaceContext
  ): Promise<Workspace> {
    logger.info('Creating workspace', { name: input.name, type: input.type, userId: context.userId });

    // Validate user can create workspace
    await this.validateWorkspaceCreation(input, context);

    // Build workspace configuration
    const workspaceConfig = this.buildWorkspaceConfig(input, context);

    // Create workspace entity
    const workspace: Workspace = {
      id: this.generateWorkspaceId(),
      name: input.name,
      description: input.description,
      type: input.type,
      status: WorkspaceStatus.PENDING,
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
    const ttlHours = DEFAULT_TTL_HOURS[input.type];
    workspace.expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // Save workspace
    await this.repository.save(workspace);

    // Audit log
    await this.auditService.log({
      action: AuditAction.WORKSPACE_CREATE,
      resourceType: 'WORKSPACE',
      resourceId: workspace.id,
      result: AuditResult.SUCCESS,
      workspaceId: workspace.id,
      ...context,
      parameters: { input },
    });

    // Check if approval required
    if (this.config.autoApprovalTypes.includes(input.type)) {
      // Auto-approve
      workspace.status = WorkspaceStatus.ACTIVE;
      await this.repository.save(workspace);

      // Provision sandbox if enabled
      if (this.config.sandboxEnabled) {
        await this.sandboxManager.createSandbox(workspace);
      }
    } else {
      // Create approval request
      const approvalRequest = await this.approvalService.createRequest({
        type: ApprovalType.WORKSPACE_CREATION,
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
  async getWorkspace(workspaceId: string, context: WorkspaceContext): Promise<Workspace | null> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      return null;
    }

    // Check access
    await this.validateWorkspaceAccess(workspace, context, 'VIEW');

    // Audit log
    await this.auditService.log({
      action: AuditAction.WORKSPACE_ACCESS,
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      result: AuditResult.SUCCESS,
      workspaceId,
      ...context,
      parameters: {},
    });

    return workspace;
  }

  /**
   * List workspaces with filtering and pagination
   */
  async listWorkspaces(
    filter: WorkspaceFilter,
    pagination: Pagination,
    context: WorkspaceContext
  ): Promise<PaginatedResult<Workspace>> {
    // Apply tenant filter
    filter.tenantIds = [context.tenantId];

    // Non-admin users can only see their own workspaces or shared ones
    if (context.userRole !== UserRole.ENGINEER) {
      filter.ownerIds = [context.userId];
    }

    return this.repository.findMany(filter, pagination);
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput,
    context: WorkspaceContext
  ): Promise<Workspace> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    await this.validateWorkspaceAccess(workspace, context, 'MANAGE');

    // Apply updates
    if (input.name) workspace.name = input.name;
    if (input.description !== undefined) workspace.description = input.description;
    if (input.tags) workspace.tags = input.tags;
    if (input.metadata) workspace.metadata = { ...workspace.metadata, ...input.metadata };

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
      action: AuditAction.WORKSPACE_UPDATE,
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      result: AuditResult.SUCCESS,
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
  async archiveWorkspace(
    workspaceId: string,
    context: WorkspaceContext
  ): Promise<Workspace> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    await this.validateWorkspaceAccess(workspace, context, 'MANAGE');

    // Stop sandbox
    if (this.config.sandboxEnabled) {
      await this.sandboxManager.stopSandbox(workspaceId, 'Workspace archived');
    }

    workspace.status = WorkspaceStatus.ARCHIVED;
    workspace.archivedAt = new Date();
    workspace.updatedAt = new Date();
    await this.repository.save(workspace);

    // Audit log
    await this.auditService.log({
      action: AuditAction.WORKSPACE_ARCHIVE,
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      result: AuditResult.SUCCESS,
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
  async deleteWorkspace(
    workspaceId: string,
    reason: string,
    context: WorkspaceContext
  ): Promise<void> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    await this.validateWorkspaceAccess(workspace, context, 'DELETE');

    // Stop sandbox
    if (this.config.sandboxEnabled) {
      await this.sandboxManager.stopSandbox(workspaceId, 'Workspace deleted');
    }

    workspace.status = WorkspaceStatus.DELETED;
    workspace.deletedAt = new Date();
    workspace.updatedAt = new Date();
    await this.repository.save(workspace);

    // Audit log
    await this.auditService.log({
      action: AuditAction.WORKSPACE_DELETE,
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      result: AuditResult.SUCCESS,
      workspaceId,
      ...context,
      parameters: { reason },
    });

    this.emit('workspace:deleted', workspace);
  }

  /**
   * Suspend workspace due to policy violation or extended idle
   */
  async suspendWorkspace(
    workspaceId: string,
    reason: string,
    context: WorkspaceContext
  ): Promise<Workspace> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Stop sandbox
    if (this.config.sandboxEnabled) {
      await this.sandboxManager.stopSandbox(workspaceId, reason);
    }

    workspace.status = WorkspaceStatus.SUSPENDED;
    workspace.suspensionReason = reason;
    workspace.updatedAt = new Date();
    await this.repository.save(workspace);

    // Audit log
    await this.auditService.log({
      action: AuditAction.WORKSPACE_SUSPEND,
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      result: AuditResult.SUCCESS,
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
  async reactivateWorkspace(
    workspaceId: string,
    justification: string,
    context: WorkspaceContext
  ): Promise<ApprovalRequest> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    if (workspace.status !== WorkspaceStatus.SUSPENDED) {
      throw new Error(`Workspace is not suspended: ${workspaceId}`);
    }

    await this.validateWorkspaceAccess(workspace, context, 'MANAGE');

    // Create approval request for reactivation
    const approvalRequest = await this.approvalService.createRequest({
      type: ApprovalType.REACTIVATION,
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
  async recordActivity(workspaceId: string): Promise<void> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      return;
    }

    // If workspace was IDLE, reactivate it
    if (workspace.status === WorkspaceStatus.IDLE) {
      workspace.status = WorkspaceStatus.ACTIVE;
    }

    workspace.lastActivityAt = new Date();
    workspace.updatedAt = new Date();
    await this.repository.save(workspace);
  }

  /**
   * Add collaborator to workspace
   */
  async addCollaborator(
    workspaceId: string,
    collaborator: { userId: string; role: UserRole; permissions: CollaboratorPermission[] },
    context: WorkspaceContext
  ): Promise<WorkspaceCollaborator> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    await this.validateWorkspaceAccess(workspace, context, 'INVITE');

    const newCollaborator: WorkspaceCollaborator = {
      userId: collaborator.userId,
      role: collaborator.role,
      permissions: collaborator.permissions,
      addedAt: new Date(),
      addedBy: context.userId,
    };

    await this.repository.addCollaborator(workspaceId, newCollaborator);

    // Audit log
    await this.auditService.log({
      action: AuditAction.COLLABORATOR_ADD,
      resourceType: 'COLLABORATOR',
      resourceId: collaborator.userId,
      result: AuditResult.SUCCESS,
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
  async removeCollaborator(
    workspaceId: string,
    userId: string,
    context: WorkspaceContext
  ): Promise<void> {
    const workspace = await this.repository.findById(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    await this.validateWorkspaceAccess(workspace, context, 'INVITE');

    await this.repository.removeCollaborator(workspaceId, userId);

    // Audit log
    await this.auditService.log({
      action: AuditAction.COLLABORATOR_REMOVE,
      resourceType: 'COLLABORATOR',
      resourceId: userId,
      result: AuditResult.SUCCESS,
      workspaceId,
      ...context,
      parameters: { removedUserId: userId },
    });

    this.emit('workspace:collaborator-removed', { workspaceId, userId });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async validateWorkspaceCreation(
    input: CreateWorkspaceInput,
    context: WorkspaceContext
  ): Promise<void> {
    // Check workspace quota
    const existingWorkspaces = await this.repository.countByOwner(context.userId);
    const maxAllowed = this.config.maxWorkspacesPerUser[context.userRole];

    if (existingWorkspaces >= maxAllowed) {
      throw new Error(
        `Workspace quota exceeded. Maximum ${maxAllowed} workspaces allowed for role ${context.userRole}`
      );
    }

    // Check workspace type permission
    if (
      input.type === WorkspaceType.MODEL_DEVELOPMENT &&
      context.userRole === UserRole.ANALYST
    ) {
      throw new Error('Analysts cannot create MODEL_DEVELOPMENT workspaces');
    }
  }

  private async validateWorkspaceAccess(
    workspace: Workspace,
    context: WorkspaceContext,
    permission: 'VIEW' | 'QUERY' | 'EXPORT' | 'MANAGE' | 'INVITE' | 'DELETE'
  ): Promise<void> {
    // Owner has full access
    if (workspace.ownerId === context.userId) {
      return;
    }

    // Engineers have admin access
    if (context.userRole === UserRole.ENGINEER) {
      return;
    }

    // Check collaborator permissions
    const collaborator = await this.repository.getCollaborator(workspace.id, context.userId);

    if (!collaborator) {
      throw new Error(`Access denied to workspace: ${workspace.id}`);
    }

    const requiredPermission = this.mapPermission(permission);
    if (!collaborator.permissions.includes(requiredPermission)) {
      throw new Error(
        `Insufficient permissions for ${permission} on workspace: ${workspace.id}`
      );
    }
  }

  private mapPermission(
    permission: 'VIEW' | 'QUERY' | 'EXPORT' | 'MANAGE' | 'INVITE' | 'DELETE'
  ): CollaboratorPermission {
    const mapping: Record<string, CollaboratorPermission> = {
      VIEW: CollaboratorPermission.VIEW,
      QUERY: CollaboratorPermission.QUERY,
      EXPORT: CollaboratorPermission.EXPORT,
      MANAGE: CollaboratorPermission.ADMIN,
      INVITE: CollaboratorPermission.INVITE,
      DELETE: CollaboratorPermission.ADMIN,
    };
    return mapping[permission];
  }

  private buildWorkspaceConfig(
    input: CreateWorkspaceInput,
    context: WorkspaceContext
  ): WorkspaceConfig {
    const defaultResources = DEFAULT_RESOURCE_CONFIGS[input.type];
    const resources = input.resourceOverrides
      ? { ...defaultResources, ...input.resourceOverrides }
      : defaultResources;

    const egressPolicy = DEFAULT_EGRESS_POLICIES[context.userRole];

    return {
      resources,
      idleTimeoutHours: this.config.defaultIdleTimeoutHours,
      archiveAfterIdleDays: 30,
      retentionDays: 90,
      autoExtend: true,
      egressPolicy,
    };
  }

  private generateWorkspaceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `ws-${timestamp}-${random}`;
  }
}

// ============================================================================
// Interfaces for Dependencies (to be injected)
// ============================================================================

export interface WorkspaceRepository {
  save(workspace: Workspace): Promise<void>;
  findById(id: string): Promise<Workspace | null>;
  findMany(filter: WorkspaceFilter, pagination: Pagination): Promise<PaginatedResult<Workspace>>;
  countByOwner(ownerId: string): Promise<number>;
  addCollaborator(workspaceId: string, collaborator: WorkspaceCollaborator): Promise<void>;
  removeCollaborator(workspaceId: string, userId: string): Promise<void>;
  getCollaborator(workspaceId: string, userId: string): Promise<WorkspaceCollaborator | null>;
}

export interface ApprovalService {
  createRequest(request: Omit<ApprovalRequest, 'id' | 'status' | 'decisions' | 'requestedAt' | 'expiresAt' | 'requiredApprovers'>): Promise<ApprovalRequest>;
  getRequest(id: string): Promise<ApprovalRequest | null>;
  decide(requestId: string, decision: { deciderId: string; decision: 'APPROVE' | 'DENY'; reason?: string }): Promise<ApprovalRequest>;
}

export interface AuditService {
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void>;
  query(filter: any, pagination: Pagination): Promise<PaginatedResult<AuditEvent>>;
}
