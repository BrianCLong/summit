import { z } from 'zod';

export enum ChangeType {
  ADD = 'add',
  MODIFY = 'modify',
  DELETE = 'delete',
  RENAME = 'rename',
  MOVE = 'move'
}

export enum MergeStrategy {
  FAST_FORWARD = 'fast_forward',
  RECURSIVE = 'recursive',
  OURS = 'ours',
  THEIRS = 'theirs',
  MANUAL = 'manual'
}

export enum ConflictResolutionStrategy {
  ACCEPT_CURRENT = 'accept_current',
  ACCEPT_INCOMING = 'accept_incoming',
  ACCEPT_BOTH = 'accept_both',
  MANUAL = 'manual'
}

export const CommitSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  parentCommits: z.array(z.string()).default([]),
  authorId: z.string(),
  authorName: z.string(),
  message: z.string(),
  description: z.string().optional(),
  timestamp: z.date(),
  changes: z.array(z.object({
    path: z.string(),
    type: z.nativeEnum(ChangeType),
    oldPath: z.string().optional(),
    contentHash: z.string(),
    previousHash: z.string().optional(),
    diff: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional()
});

export const BranchSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  name: z.string(),
  headCommitId: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  isProtected: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});

export const TagSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  name: z.string(),
  commitId: z.string(),
  message: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export const RepositorySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  defaultBranch: z.string().default('main'),
  createdBy: z.string(),
  createdAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export const DiffSchema = z.object({
  path: z.string(),
  changeType: z.nativeEnum(ChangeType),
  additions: z.number(),
  deletions: z.number(),
  hunks: z.array(z.object({
    oldStart: z.number(),
    oldLines: z.number(),
    newStart: z.number(),
    newLines: z.number(),
    lines: z.array(z.object({
      type: z.enum(['add', 'delete', 'context']),
      content: z.string(),
      oldLineNumber: z.number().optional(),
      newLineNumber: z.number().optional()
    }))
  }))
});

export const MergeResultSchema = z.object({
  success: z.boolean(),
  targetBranch: z.string(),
  sourceBranch: z.string(),
  mergeCommitId: z.string().optional(),
  conflicts: z.array(z.object({
    path: z.string(),
    type: z.string(),
    currentContent: z.any(),
    incomingContent: z.any(),
    baseContent: z.any().optional(),
    resolved: z.boolean().default(false),
    resolution: z.any().optional()
  })).default([]),
  strategy: z.nativeEnum(MergeStrategy),
  timestamp: z.date()
});

export const BlameSchema = z.object({
  path: z.string(),
  lines: z.array(z.object({
    lineNumber: z.number(),
    content: z.string(),
    commitId: z.string(),
    authorId: z.string(),
    authorName: z.string(),
    timestamp: z.date()
  }))
});

// Type exports
export type Commit = z.infer<typeof CommitSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Repository = z.infer<typeof RepositorySchema>;
export type Diff = z.infer<typeof DiffSchema>;
export type MergeResult = z.infer<typeof MergeResultSchema>;
export type Blame = z.infer<typeof BlameSchema>;

export interface CommitTree {
  commit: Commit;
  children: CommitTree[];
  branches: string[];
  tags: string[];
}

export interface CompareResult {
  diffs: Diff[];
  commits: Commit[];
  filesChanged: number;
  additions: number;
  deletions: number;
}
