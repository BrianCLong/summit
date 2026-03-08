"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceActivitySchema = exports.WorkspaceTemplateSchema = exports.WorkspaceInvitationSchema = exports.ProjectMemberSchema = exports.ProjectSchema = exports.WorkspaceMemberSchema = exports.WorkspaceSchema = exports.ResourcePermission = exports.WorkspaceRole = void 0;
const zod_1 = require("zod");
// Role-based access control
var WorkspaceRole;
(function (WorkspaceRole) {
    WorkspaceRole["OWNER"] = "owner";
    WorkspaceRole["ADMIN"] = "admin";
    WorkspaceRole["MEMBER"] = "member";
    WorkspaceRole["VIEWER"] = "viewer";
    WorkspaceRole["GUEST"] = "guest";
})(WorkspaceRole || (exports.WorkspaceRole = WorkspaceRole = {}));
var ResourcePermission;
(function (ResourcePermission) {
    ResourcePermission["READ"] = "read";
    ResourcePermission["WRITE"] = "write";
    ResourcePermission["DELETE"] = "delete";
    ResourcePermission["SHARE"] = "share";
    ResourcePermission["ADMIN"] = "admin";
})(ResourcePermission || (exports.ResourcePermission = ResourcePermission = {}));
// Workspace schemas
exports.WorkspaceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    ownerId: zod_1.z.string(),
    organizationId: zod_1.z.string().optional(),
    settings: zod_1.z.object({
        isPublic: zod_1.z.boolean().default(false),
        allowGuestAccess: zod_1.z.boolean().default(false),
        defaultMemberRole: zod_1.z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
        features: zod_1.z.object({
            realTimeCollaboration: zod_1.z.boolean().default(true),
            versionControl: zod_1.z.boolean().default(true),
            commenting: zod_1.z.boolean().default(true),
            taskManagement: zod_1.z.boolean().default(true),
            knowledgeBase: zod_1.z.boolean().default(true),
            videoConferencing: zod_1.z.boolean().default(false),
            marketplace: zod_1.z.boolean().default(false)
        }).default({})
    }).default({}),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    archivedAt: zod_1.z.date().optional()
});
exports.WorkspaceMemberSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    userId: zod_1.z.string(),
    role: zod_1.z.nativeEnum(WorkspaceRole),
    permissions: zod_1.z.array(zod_1.z.nativeEnum(ResourcePermission)).default([]),
    customPermissions: zod_1.z.record(zod_1.z.boolean()).optional(),
    joinedAt: zod_1.z.date(),
    invitedBy: zod_1.z.string().optional(),
    lastActiveAt: zod_1.z.date().optional()
});
exports.ProjectSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    ownerId: zod_1.z.string(),
    settings: zod_1.z.object({
        isPrivate: zod_1.z.boolean().default(false),
        requireApproval: zod_1.z.boolean().default(false),
        defaultPermissions: zod_1.z.array(zod_1.z.nativeEnum(ResourcePermission)).default([ResourcePermission.READ])
    }).default({}),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    archivedAt: zod_1.z.date().optional()
});
exports.ProjectMemberSchema = zod_1.z.object({
    id: zod_1.z.string(),
    projectId: zod_1.z.string(),
    userId: zod_1.z.string(),
    role: zod_1.z.nativeEnum(WorkspaceRole),
    permissions: zod_1.z.array(zod_1.z.nativeEnum(ResourcePermission)),
    addedAt: zod_1.z.date(),
    addedBy: zod_1.z.string()
});
exports.WorkspaceInvitationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: zod_1.z.nativeEnum(WorkspaceRole),
    invitedBy: zod_1.z.string(),
    token: zod_1.z.string(),
    expiresAt: zod_1.z.date(),
    acceptedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date()
});
exports.WorkspaceTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.string(),
    icon: zod_1.z.string().optional(),
    config: zod_1.z.object({
        defaultProjects: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            color: zod_1.z.string().optional()
        })).default([]),
        defaultChannels: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string().optional()
        })).default([]),
        defaultSettings: zod_1.z.record(zod_1.z.any()).default({})
    }),
    isPublic: zod_1.z.boolean().default(true),
    usageCount: zod_1.z.number().default(0),
    createdBy: zod_1.z.string().optional(),
    createdAt: zod_1.z.date()
});
exports.WorkspaceActivitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    userId: zod_1.z.string(),
    action: zod_1.z.enum([
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
    resourceType: zod_1.z.string().optional(),
    resourceId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date()
});
