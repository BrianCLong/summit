"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlameSchema = exports.MergeResultSchema = exports.DiffSchema = exports.RepositorySchema = exports.TagSchema = exports.BranchSchema = exports.CommitSchema = exports.ConflictResolutionStrategy = exports.MergeStrategy = exports.ChangeType = void 0;
const zod_1 = require("zod");
var ChangeType;
(function (ChangeType) {
    ChangeType["ADD"] = "add";
    ChangeType["MODIFY"] = "modify";
    ChangeType["DELETE"] = "delete";
    ChangeType["RENAME"] = "rename";
    ChangeType["MOVE"] = "move";
})(ChangeType || (exports.ChangeType = ChangeType = {}));
var MergeStrategy;
(function (MergeStrategy) {
    MergeStrategy["FAST_FORWARD"] = "fast_forward";
    MergeStrategy["RECURSIVE"] = "recursive";
    MergeStrategy["OURS"] = "ours";
    MergeStrategy["THEIRS"] = "theirs";
    MergeStrategy["MANUAL"] = "manual";
})(MergeStrategy || (exports.MergeStrategy = MergeStrategy = {}));
var ConflictResolutionStrategy;
(function (ConflictResolutionStrategy) {
    ConflictResolutionStrategy["ACCEPT_CURRENT"] = "accept_current";
    ConflictResolutionStrategy["ACCEPT_INCOMING"] = "accept_incoming";
    ConflictResolutionStrategy["ACCEPT_BOTH"] = "accept_both";
    ConflictResolutionStrategy["MANUAL"] = "manual";
})(ConflictResolutionStrategy || (exports.ConflictResolutionStrategy = ConflictResolutionStrategy = {}));
exports.CommitSchema = zod_1.z.object({
    id: zod_1.z.string(),
    repositoryId: zod_1.z.string(),
    parentCommits: zod_1.z.array(zod_1.z.string()).default([]),
    authorId: zod_1.z.string(),
    authorName: zod_1.z.string(),
    message: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    timestamp: zod_1.z.date(),
    changes: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        type: zod_1.z.nativeEnum(ChangeType),
        oldPath: zod_1.z.string().optional(),
        contentHash: zod_1.z.string(),
        previousHash: zod_1.z.string().optional(),
        diff: zod_1.z.string().optional(),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    })),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.BranchSchema = zod_1.z.object({
    id: zod_1.z.string(),
    repositoryId: zod_1.z.string(),
    name: zod_1.z.string(),
    headCommitId: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    isProtected: zod_1.z.boolean().default(false),
    isDefault: zod_1.z.boolean().default(false),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.TagSchema = zod_1.z.object({
    id: zod_1.z.string(),
    repositoryId: zod_1.z.string(),
    name: zod_1.z.string(),
    commitId: zod_1.z.string(),
    message: zod_1.z.string().optional(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.RepositorySchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    defaultBranch: zod_1.z.string().default('main'),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.DiffSchema = zod_1.z.object({
    path: zod_1.z.string(),
    changeType: zod_1.z.nativeEnum(ChangeType),
    additions: zod_1.z.number(),
    deletions: zod_1.z.number(),
    hunks: zod_1.z.array(zod_1.z.object({
        oldStart: zod_1.z.number(),
        oldLines: zod_1.z.number(),
        newStart: zod_1.z.number(),
        newLines: zod_1.z.number(),
        lines: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(['add', 'delete', 'context']),
            content: zod_1.z.string(),
            oldLineNumber: zod_1.z.number().optional(),
            newLineNumber: zod_1.z.number().optional()
        }))
    }))
});
exports.MergeResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    targetBranch: zod_1.z.string(),
    sourceBranch: zod_1.z.string(),
    mergeCommitId: zod_1.z.string().optional(),
    conflicts: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        type: zod_1.z.string(),
        currentContent: zod_1.z.any(),
        incomingContent: zod_1.z.any(),
        baseContent: zod_1.z.any().optional(),
        resolved: zod_1.z.boolean().default(false),
        resolution: zod_1.z.any().optional()
    })).default([]),
    strategy: zod_1.z.nativeEnum(MergeStrategy),
    timestamp: zod_1.z.date()
});
exports.BlameSchema = zod_1.z.object({
    path: zod_1.z.string(),
    lines: zod_1.z.array(zod_1.z.object({
        lineNumber: zod_1.z.number(),
        content: zod_1.z.string(),
        commitId: zod_1.z.string(),
        authorId: zod_1.z.string(),
        authorName: zod_1.z.string(),
        timestamp: zod_1.z.date()
    }))
});
