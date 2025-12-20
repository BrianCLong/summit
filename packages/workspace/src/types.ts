import { z } from 'zod';

// Role-based access control
export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
  GUEST = 'guest'
}

export enum ResourcePermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  ADMIN = 'admin'
}

// Workspace schemas
export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  organizationId: z.string().optional(),
  settings: z.object({
    isPublic: z.boolean().default(false),
    allowGuestAccess: z.boolean().default(false),
    defaultMemberRole: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
    features: z.object({
      realTimeCollaboration: z.boolean().default(true),
      versionControl: z.boolean().default(true),
      commenting: z.boolean().default(true),
      taskManagement: z.boolean().default(true),
      knowledgeBase: z.boolean().default(true),
      videoConferencing: z.boolean().default(false),
      marketplace: z.boolean().default(false)
    }).default({})
  }).default({}),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archivedAt: z.date().optional()
});

export const WorkspaceMemberSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: z.nativeEnum(WorkspaceRole),
  permissions: z.array(z.nativeEnum(ResourcePermission)).default([]),
  customPermissions: z.record(z.boolean()).optional(),
  joinedAt: z.date(),
  invitedBy: z.string().optional(),
  lastActiveAt: z.date().optional()
});

export const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  ownerId: z.string(),
  settings: z.object({
    isPrivate: z.boolean().default(false),
    requireApproval: z.boolean().default(false),
    defaultPermissions: z.array(z.nativeEnum(ResourcePermission)).default([ResourcePermission.READ])
  }).default({}),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archivedAt: z.date().optional()
});

export const ProjectMemberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: z.nativeEnum(WorkspaceRole),
  permissions: z.array(z.nativeEnum(ResourcePermission)),
  addedAt: z.date(),
  addedBy: z.string()
});

export const WorkspaceInvitationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(WorkspaceRole),
  invitedBy: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  acceptedAt: z.date().optional(),
  createdAt: z.date()
});

export const WorkspaceTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  icon: z.string().optional(),
  config: z.object({
    defaultProjects: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      color: z.string().optional()
    })).default([]),
    defaultChannels: z.array(z.object({
      name: z.string(),
      description: z.string().optional()
    })).default([]),
    defaultSettings: z.record(z.any()).default({})
  }),
  isPublic: z.boolean().default(true),
  usageCount: z.number().default(0),
  createdBy: z.string().optional(),
  createdAt: z.date()
});

export const WorkspaceActivitySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  action: z.enum([
    'workspace.created',
    'workspace.updated',
    'workspace.deleted',
    'member.added',
    'member.removed',
    'member.role_changed',
    'project.created',
    'project.updated',
    'project.deleted',
    'resource.created',
    'resource.updated',
    'resource.deleted',
    'resource.shared',
    'settings.updated'
  ]),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date()
});

// Type exports
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;
export type WorkspaceInvitation = z.infer<typeof WorkspaceInvitationSchema>;
export type WorkspaceTemplate = z.infer<typeof WorkspaceTemplateSchema>;
export type WorkspaceActivity = z.infer<typeof WorkspaceActivitySchema>;

// Permission checking
export interface PermissionContext {
  userId: string;
  workspaceId: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface PermissionCheck {
  granted: boolean;
  reason?: string;
  requiredRole?: WorkspaceRole;
  requiredPermission?: ResourcePermission;
}
