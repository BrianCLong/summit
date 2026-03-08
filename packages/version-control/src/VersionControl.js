"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionControl = void 0;
const events_1 = require("events");
const fastDiff = __importStar(require("fast-diff"));
const types_1 = require("./types");
class VersionControl extends events_1.EventEmitter {
    store;
    constructor(store) {
        super();
        this.store = store;
    }
    // Repository management
    async initRepository(workspaceId, resourceType, resourceId, createdBy) {
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
    async createBranch(repositoryId, name, sourceCommitId, createdBy, options) {
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
    async deleteBranch(repositoryId, branchName) {
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
    async commit(repositoryId, branchName, authorId, authorName, message, changes, options) {
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
    async getCommitHistory(repositoryId, branchName, options) {
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
            commits = commits.filter(c => c.timestamp >= options.since);
        }
        if (options?.until) {
            commits = commits.filter(c => c.timestamp <= options.until);
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
    async diff(repositoryId, fromCommitId, toCommitId) {
        const fromCommit = await this.store.getCommit(fromCommitId);
        const toCommit = await this.store.getCommit(toCommitId);
        if (!fromCommit || !toCommit) {
            throw new Error('Commit not found');
        }
        const diffs = [];
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
    async compare(repositoryId, baseBranch, compareBranch) {
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
    async merge(repositoryId, targetBranch, sourceBranch, mergedBy, strategy = types_1.MergeStrategy.RECURSIVE) {
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
        if (canFastForward && strategy === types_1.MergeStrategy.FAST_FORWARD) {
            // Fast-forward merge
            await this.store.updateBranch(target.id, {
                headCommitId: source.headCommitId
            });
            const result = {
                success: true,
                targetBranch,
                sourceBranch,
                mergeCommitId: source.headCommitId,
                conflicts: [],
                strategy: types_1.MergeStrategy.FAST_FORWARD,
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
        const conflicts = await this.detectMergeConflicts(repositoryId, mergeBase.id, target.headCommitId, source.headCommitId);
        if (conflicts.length > 0 && strategy !== types_1.MergeStrategy.MANUAL) {
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
        const result = {
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
    async revert(repositoryId, branchName, commitId, revertedBy) {
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
        const revertCommit = await this.commit(repositoryId, branchName, revertedBy, 'System', `Revert "${commit.message}"`, reverseChanges, {
            description: `This reverts commit ${commitId}`,
            metadata: { revertedCommitId: commitId }
        });
        this.emit('commit:reverted', { originalCommit: commit, revertCommit });
        return revertCommit;
    }
    // Blame
    async blame(repositoryId, branchName, path) {
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
    async createTag(repositoryId, name, commitId, createdBy, message) {
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
    async getCommitTree(repositoryId, options) {
        const branches = options?.branches
            ? await Promise.all(options.branches.map(name => this.store.getBranch(repositoryId, name)))
            : await this.store.listBranches(repositoryId);
        const allCommits = new Map();
        const children = new Map();
        for (const branch of branches.filter(Boolean)) {
            const commits = await this.store.getCommitHistory(branch.headCommitId);
            for (const commit of commits) {
                allCommits.set(commit.id, commit);
                for (const parentId of commit.parentCommits) {
                    if (!children.has(parentId)) {
                        children.set(parentId, []);
                    }
                    children.get(parentId).push(commit.id);
                }
            }
        }
        // Find root commit(s)
        const roots = Array.from(allCommits.values()).filter(c => c.parentCommits.length === 0);
        if (roots.length === 0) {
            throw new Error('No root commit found');
        }
        const buildTree = (commitId) => {
            const commit = allCommits.get(commitId);
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
    computeDiff(path, fromContent, toContent) {
        if (typeof fromContent !== 'string' || typeof toContent !== 'string') {
            // For non-text content, just indicate the change
            return {
                path,
                changeType: !fromContent ? types_1.ChangeType.ADD : !toContent ? types_1.ChangeType.DELETE : types_1.ChangeType.MODIFY,
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
            }
            else if (type === fastDiff.DELETE) {
                deletions += text.split('\n').length - 1;
            }
        }
        return {
            path,
            changeType: types_1.ChangeType.MODIFY,
            additions,
            deletions,
            hunks: [] // Would compute actual hunks for detailed diff view
        };
    }
    async findMergeBase(commitId1, commitId2) {
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
    async detectMergeConflicts(repositoryId, baseCommitId, targetCommitId, sourceCommitId) {
        const baseCommit = await this.store.getCommit(baseCommitId);
        const targetCommit = await this.store.getCommit(targetCommitId);
        const sourceCommit = await this.store.getCommit(sourceCommitId);
        if (!baseCommit || !targetCommit || !sourceCommit) {
            return [];
        }
        const conflicts = [];
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
    getReverseChangeType(type) {
        switch (type) {
            case types_1.ChangeType.ADD:
                return types_1.ChangeType.DELETE;
            case types_1.ChangeType.DELETE:
                return types_1.ChangeType.ADD;
            default:
                return type;
        }
    }
}
exports.VersionControl = VersionControl;
