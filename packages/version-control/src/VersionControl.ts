import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';
import * as fastDiff from 'fast-diff';
import {
  Repository,
  Branch,
  Commit,
  Tag,
  Diff,
  MergeResult,
  Blame,
  ChangeType,
  MergeStrategy,
  CommitTree,
  CompareResult
} from './types';

export interface VersionControlStore {
  // Repository operations
  createRepository(repo: Omit<Repository, 'id' | 'createdAt'>): Promise<Repository>;
  getRepository(id: string): Promise<Repository | null>;
  getRepositoryForResource(resourceType: string, resourceId: string): Promise<Repository | null>;

  // Branch operations
  createBranch(branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch>;
  getBranch(repositoryId: string, name: string): Promise<Branch | null>;
  listBranches(repositoryId: string): Promise<Branch[]>;
  updateBranch(branchId: string, updates: Partial<Branch>): Promise<Branch>;
  deleteBranch(branchId: string): Promise<void>;

  // Commit operations
  createCommit(commit: Omit<Commit, 'id' | 'timestamp'>): Promise<Commit>;
  getCommit(commitId: string): Promise<Commit | null>;
  listCommits(branchId: string, limit?: number): Promise<Commit[]>;
  getCommitHistory(commitId: string): Promise<Commit[]>;

  // Tag operations
  createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag>;
  getTag(repositoryId: string, name: string): Promise<Tag | null>;
  listTags(repositoryId: string): Promise<Tag[]>;
  deleteTag(tagId: string): Promise<void>;

  // Content operations
  getContent(commitId: string, path: string): Promise<any>;
  saveContent(path: string, content: any): Promise<{ hash: string }>;
}

export class VersionControl extends EventEmitter {
  constructor(private store: VersionControlStore) {
    super();
  }

  // Repository management
  async initRepository(
    workspaceId: string,
    resourceType: string,
    resourceId: string,
    createdBy: string
  ): Promise<Repository> {
    const repository = await this.store.createRepository({
      workspaceId,
      resourceType,
      resourceId,
      defaultBranch: 'main',
      createdBy
    });

    // Create default branch
    const initialCommit = await this.store.createCommit({
      repositoryId: repository.id,
      parentCommits: [],
      authorId: createdBy,
      authorName: 'System',
      message: 'Initial commit',
      changes: []
    });

    await this.store.createBranch({
      repositoryId: repository.id,
      name: 'main',
      headCommitId: initialCommit.id,
      createdBy,
      isProtected: false,
      isDefault: true
    });

    this.emit('repository:created', { repository });

    return repository;
  }

  // Branch management
  async createBranch(
    repositoryId: string,
    name: string,
    sourceCommitId: string,
    createdBy: string,
    options?: {
      isProtected?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<Branch> {
    const branch = await this.store.createBranch({
      repositoryId,
      name,
      headCommitId: sourceCommitId,
      createdBy,
      isProtected: options?.isProtected || false,
      isDefault: false,
      metadata: options?.metadata
    });

    this.emit('branch:created', { branch });

    return branch;
  }

  async deleteBranch(repositoryId: string, branchName: string): Promise<void> {
    const branch = await this.store.getBranch(repositoryId, branchName);
    if (!branch) {
      throw new Error('Branch not found');
    }

    if (branch.isProtected) {
      throw new Error('Cannot delete protected branch');
    }

    if (branch.isDefault) {
      throw new Error('Cannot delete default branch');
    }

    await this.store.deleteBranch(branch.id);

    this.emit('branch:deleted', { branchId: branch.id, branchName });
  }

  // Commit management
  async commit(
    repositoryId: string,
    branchName: string,
    authorId: string,
    authorName: string,
    message: string,
    changes: Commit['changes'],
    options?: {
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Commit> {
    const branch = await this.store.getBranch(repositoryId, branchName);
    if (!branch) {
      throw new Error('Branch not found');
    }

    // Create commit
    const commit = await this.store.createCommit({
      repositoryId,
      parentCommits: [branch.headCommitId],
      authorId,
      authorName,
      message,
      description: options?.description,
      changes,
      tags: [],
      metadata: options?.metadata
    });

    // Update branch head
    await this.store.updateBranch(branch.id, {
      headCommitId: commit.id
    });

    this.emit('commit:created', { commit, branch: branchName });

    return commit;
  }

  async getCommitHistory(
    repositoryId: string,
    branchName: string,
    options?: {
      limit?: number;
      skip?: number;
      author?: string;
      since?: Date;
      until?: Date;
    }
  ): Promise<Commit[]> {
    const branch = await this.store.getBranch(repositoryId, branchName);
    if (!branch) {
      throw new Error('Branch not found');
    }

    let commits = await this.store.getCommitHistory(branch.headCommitId);

    // Apply filters
    if (options?.author) {
      commits = commits.filter(c => c.authorId === options.author);
    }

    if (options?.since) {
      commits = commits.filter(c => c.timestamp >= options.since!);
    }

    if (options?.until) {
      commits = commits.filter(c => c.timestamp <= options.until!);
    }

    // Apply pagination
    if (options?.skip) {
      commits = commits.slice(options.skip);
    }

    if (options?.limit) {
      commits = commits.slice(0, options.limit);
    }

    return commits;
  }

  // Diff and compare
  async diff(
    repositoryId: string,
    fromCommitId: string,
    toCommitId: string
  ): Promise<Diff[]> {
    const fromCommit = await this.store.getCommit(fromCommitId);
    const toCommit = await this.store.getCommit(toCommitId);

    if (!fromCommit || !toCommit) {
      throw new Error('Commit not found');
    }

    const diffs: Diff[] = [];

    // Get all changed paths
    const changedPaths = new Set([
      ...fromCommit.changes.map(c => c.path),
      ...toCommit.changes.map(c => c.path)
    ]);

    for (const path of changedPaths) {
      const fromContent = await this.store.getContent(fromCommitId, path);
      const toContent = await this.store.getContent(toCommitId, path);

      const diff = this.computeDiff(path, fromContent, toContent);
      diffs.push(diff);
    }

    return diffs;
  }

  async compare(
    repositoryId: string,
    baseBranch: string,
    compareBranch: string
  ): Promise<CompareResult> {
    const base = await this.store.getBranch(repositoryId, baseBranch);
    const compare = await this.store.getBranch(repositoryId, compareBranch);

    if (!base || !compare) {
      throw new Error('Branch not found');
    }

    // Get commits in compare branch not in base
    const compareCommits = await this.store.getCommitHistory(compare.headCommitId);
    const baseCommits = await this.store.getCommitHistory(base.headCommitId);
    const baseCommitIds = new Set(baseCommits.map(c => c.id));

    const commits = compareCommits.filter(c => !baseCommitIds.has(c.id));

    // Get diffs
    const diffs = await this.diff(repositoryId, base.headCommitId, compare.headCommitId);

    // Calculate stats
    const additions = diffs.reduce((sum, d) => sum + d.additions, 0);
    const deletions = diffs.reduce((sum, d) => sum + d.deletions, 0);

    return {
      diffs,
      commits,
      filesChanged: diffs.length,
      additions,
      deletions
    };
  }

  // Merge
  async merge(
    repositoryId: string,
    targetBranch: string,
    sourceBranch: string,
    mergedBy: string,
    strategy: MergeStrategy = MergeStrategy.RECURSIVE
  ): Promise<MergeResult> {
    const target = await this.store.getBranch(repositoryId, targetBranch);
    const source = await this.store.getBranch(repositoryId, sourceBranch);

    if (!target || !source) {
      throw new Error('Branch not found');
    }

    if (target.isProtected) {
      throw new Error('Cannot merge into protected branch without approval');
    }

    // Check if fast-forward is possible
    const targetCommits = await this.store.getCommitHistory(target.headCommitId);
    const sourceCommits = await this.store.getCommitHistory(source.headCommitId);
    const targetCommitIds = new Set(targetCommits.map(c => c.id));

    const canFastForward = targetCommitIds.has(source.headCommitId);

    if (canFastForward && strategy === MergeStrategy.FAST_FORWARD) {
      // Fast-forward merge
      await this.store.updateBranch(target.id, {
        headCommitId: source.headCommitId
      });

      const result: MergeResult = {
        success: true,
        targetBranch,
        sourceBranch,
        mergeCommitId: source.headCommitId,
        conflicts: [],
        strategy: MergeStrategy.FAST_FORWARD,
        timestamp: new Date()
      };

      this.emit('merge:completed', { result });

      return result;
    }

    // Three-way merge
    const mergeBase = await this.findMergeBase(target.headCommitId, source.headCommitId);

    if (!mergeBase) {
      throw new Error('No common ancestor found');
    }

    // Detect conflicts
    const conflicts = await this.detectMergeConflicts(
      repositoryId,
      mergeBase.id,
      target.headCommitId,
      source.headCommitId
    );

    if (conflicts.length > 0 && strategy !== MergeStrategy.MANUAL) {
      return {
        success: false,
        targetBranch,
        sourceBranch,
        conflicts,
        strategy,
        timestamp: new Date()
      };
    }

    // Create merge commit
    const mergeCommit = await this.store.createCommit({
      repositoryId,
      parentCommits: [target.headCommitId, source.headCommitId],
      authorId: mergedBy,
      authorName: 'System',
      message: `Merge ${sourceBranch} into ${targetBranch}`,
      changes: []
    });

    await this.store.updateBranch(target.id, {
      headCommitId: mergeCommit.id
    });

    const result: MergeResult = {
      success: true,
      targetBranch,
      sourceBranch,
      mergeCommitId: mergeCommit.id,
      conflicts: [],
      strategy,
      timestamp: new Date()
    };

    this.emit('merge:completed', { result });

    return result;
  }

  // Rollback/revert
  async revert(
    repositoryId: string,
    branchName: string,
    commitId: string,
    revertedBy: string
  ): Promise<Commit> {
    const commit = await this.store.getCommit(commitId);
    if (!commit) {
      throw new Error('Commit not found');
    }

    // Create reverse changes
    const reverseChanges = commit.changes.map(change => ({
      ...change,
      type: this.getReverseChangeType(change.type),
      contentHash: change.previousHash || '',
      previousHash: change.contentHash
    }));

    // Create revert commit
    const revertCommit = await this.commit(
      repositoryId,
      branchName,
      revertedBy,
      'System',
      `Revert "${commit.message}"`,
      reverseChanges,
      {
        description: `This reverts commit ${commitId}`,
        metadata: { revertedCommitId: commitId }
      }
    );

    this.emit('commit:reverted', { originalCommit: commit, revertCommit });

    return revertCommit;
  }

  // Blame
  async blame(
    repositoryId: string,
    branchName: string,
    path: string
  ): Promise<Blame> {
    const branch = await this.store.getBranch(repositoryId, branchName);
    if (!branch) {
      throw new Error('Branch not found');
    }

    const commits = await this.store.getCommitHistory(branch.headCommitId);
    const content = await this.store.getContent(branch.headCommitId, path);

    if (typeof content !== 'string') {
      throw new Error('Blame only supported for text content');
    }

    const lines = content.split('\n');
    const blameLines = [];

    // Simple blame implementation - find which commit last modified each line
    for (let i = 0; i < lines.length; i++) {
      let foundCommit = commits[0]; // Default to latest commit

      for (const commit of commits) {
        const commitContent = await this.store.getContent(commit.id, path);
        if (typeof commitContent === 'string') {
          const commitLines = commitContent.split('\n');
          if (commitLines[i] === lines[i]) {
            foundCommit = commit;
            break;
          }
        }
      }

      blameLines.push({
        lineNumber: i + 1,
        content: lines[i],
        commitId: foundCommit.id,
        authorId: foundCommit.authorId,
        authorName: foundCommit.authorName,
        timestamp: foundCommit.timestamp
      });
    }

    return {
      path,
      lines: blameLines
    };
  }

  // Tag management
  async createTag(
    repositoryId: string,
    name: string,
    commitId: string,
    createdBy: string,
    message?: string
  ): Promise<Tag> {
    const tag = await this.store.createTag({
      repositoryId,
      name,
      commitId,
      message,
      createdBy
    });

    this.emit('tag:created', { tag });

    return tag;
  }

  // Tree visualization
  async getCommitTree(
    repositoryId: string,
    options?: {
      limit?: number;
      branches?: string[];
    }
  ): Promise<CommitTree> {
    const branches = options?.branches
      ? await Promise.all(
          options.branches.map(name => this.store.getBranch(repositoryId, name))
        )
      : await this.store.listBranches(repositoryId);

    const allCommits = new Map<string, Commit>();
    const children = new Map<string, string[]>();

    for (const branch of branches.filter(Boolean)) {
      const commits = await this.store.getCommitHistory(branch!.headCommitId);
      for (const commit of commits) {
        allCommits.set(commit.id, commit);

        for (const parentId of commit.parentCommits) {
          if (!children.has(parentId)) {
            children.set(parentId, []);
          }
          children.get(parentId)!.push(commit.id);
        }
      }
    }

    // Find root commit(s)
    const roots = Array.from(allCommits.values()).filter(
      c => c.parentCommits.length === 0
    );

    if (roots.length === 0) {
      throw new Error('No root commit found');
    }

    const buildTree = (commitId: string): CommitTree => {
      const commit = allCommits.get(commitId)!;
      const childIds = children.get(commitId) || [];

      return {
        commit,
        children: childIds.map(buildTree),
        branches: [],
        tags: []
      };
    };

    return buildTree(roots[0].id);
  }

  // Helper methods
  private computeDiff(path: string, fromContent: any, toContent: any): Diff {
    if (typeof fromContent !== 'string' || typeof toContent !== 'string') {
      // For non-text content, just indicate the change
      return {
        path,
        changeType: !fromContent ? ChangeType.ADD : !toContent ? ChangeType.DELETE : ChangeType.MODIFY,
        additions: 1,
        deletions: 1,
        hunks: []
      };
    }

    const diffs = fastDiff(fromContent, toContent);
    let additions = 0;
    let deletions = 0;

    for (const [type, text] of diffs) {
      if (type === fastDiff.INSERT) {
        additions += text.split('\n').length - 1;
      } else if (type === fastDiff.DELETE) {
        deletions += text.split('\n').length - 1;
      }
    }

    return {
      path,
      changeType: ChangeType.MODIFY,
      additions,
      deletions,
      hunks: [] // Would compute actual hunks for detailed diff view
    };
  }

  private async findMergeBase(commitId1: string, commitId2: string): Promise<Commit | null> {
    const commits1 = await this.store.getCommitHistory(commitId1);
    const commits2 = await this.store.getCommitHistory(commitId2);

    const commitIds2 = new Set(commits2.map(c => c.id));

    for (const commit of commits1) {
      if (commitIds2.has(commit.id)) {
        return commit;
      }
    }

    return null;
  }

  private async detectMergeConflicts(
    repositoryId: string,
    baseCommitId: string,
    targetCommitId: string,
    sourceCommitId: string
  ): Promise<MergeResult['conflicts']> {
    const baseCommit = await this.store.getCommit(baseCommitId);
    const targetCommit = await this.store.getCommit(targetCommitId);
    const sourceCommit = await this.store.getCommit(sourceCommitId);

    if (!baseCommit || !targetCommit || !sourceCommit) {
      return [];
    }

    const conflicts: MergeResult['conflicts'] = [];

    // Find files modified in both branches
    const targetPaths = new Set(targetCommit.changes.map(c => c.path));
    const sourcePaths = new Set(sourceCommit.changes.map(c => c.path));

    for (const path of targetPaths) {
      if (sourcePaths.has(path)) {
        const baseContent = await this.store.getContent(baseCommitId, path);
        const targetContent = await this.store.getContent(targetCommitId, path);
        const sourceContent = await this.store.getContent(sourceCommitId, path);

        if (JSON.stringify(targetContent) !== JSON.stringify(sourceContent)) {
          conflicts.push({
            path,
            type: 'content',
            currentContent: targetContent,
            incomingContent: sourceContent,
            baseContent,
            resolved: false
          });
        }
      }
    }

    return conflicts;
  }

  private getReverseChangeType(type: ChangeType): ChangeType {
    switch (type) {
      case ChangeType.ADD:
        return ChangeType.DELETE;
      case ChangeType.DELETE:
        return ChangeType.ADD;
      default:
        return type;
    }
  }
}
