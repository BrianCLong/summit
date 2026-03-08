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
exports.worktreeEngine = exports.WorktreeEngine = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const provenance_ledger_js_1 = require("./provenance-ledger.js");
class AsyncQueue {
    tail = Promise.resolve();
    enqueue(task) {
        const result = this.tail.then(task, task);
        this.tail = result.catch(() => undefined);
        return result;
    }
}
function sanitizeCommand(command) {
    return command.replace(/\s+/g, ' ').trim();
}
function ensureWithinRepo(repoPath, worktreePath) {
    const resolvedRepo = path.resolve(repoPath);
    const resolvedWorktree = path.resolve(worktreePath);
    if (!resolvedWorktree.startsWith(resolvedRepo)) {
        throw new Error(`Worktree path ${resolvedWorktree} must reside within repo ${resolvedRepo}`);
    }
}
class WorktreeEngine {
    repoRoot;
    queues = new Map();
    worktrees = new Map();
    constructor(repoRoot = process.cwd()) {
        this.repoRoot = repoRoot;
    }
    getQueue(projectPath) {
        const key = path.resolve(projectPath);
        if (!this.queues.has(key)) {
            this.queues.set(key, new AsyncQueue());
        }
        return this.queues.get(key);
    }
    registerWorktree(entry) {
        this.worktrees.set(entry.id, entry);
        return entry;
    }
    async create(options) {
        const queue = this.getQueue(options.projectPath);
        return queue.enqueue(async () => {
            const repoPath = path.resolve(this.repoRoot, options.projectPath);
            const branch = `crystal/session/${(0, crypto_1.randomUUID)()}`;
            const worktreePath = path.join(repoPath, '.crystal', branch.replace(/\//g, '_'));
            ensureWithinRepo(repoPath, worktreePath);
            await fs_1.promises.mkdir(worktreePath, { recursive: true });
            const now = new Date().toISOString();
            const metadata = {
                id: (0, crypto_1.randomUUID)(),
                branch,
                repoPath,
                worktreePath,
                status: 'ready',
                createdAt: now,
                updatedAt: now,
            };
            provenance_ledger_js_1.provenanceLedger.record('worktree-engine', 'create', metadata);
            return this.registerWorktree(metadata);
        });
    }
    async status(worktreeId) {
        return this.worktrees.get(worktreeId);
    }
    async rebaseFromMain(worktreeId, mainBranch = 'main') {
        const worktree = this.worktrees.get(worktreeId);
        if (!worktree) {
            throw new Error(`Unknown worktree ${worktreeId}`);
        }
        const queue = this.getQueue(worktree.repoPath);
        return queue.enqueue(async () => {
            const now = new Date().toISOString();
            const updated = {
                ...worktree,
                status: 'rebase',
                lastRebasedAt: now,
                updatedAt: now,
            };
            this.worktrees.set(worktreeId, updated);
            provenance_ledger_js_1.provenanceLedger.record('worktree-engine', 'rebase-from-main', {
                worktreeId,
                mainBranch,
            });
            updated.status = 'ready';
            updated.updatedAt = new Date().toISOString();
            this.worktrees.set(worktreeId, { ...updated });
            return this.worktrees.get(worktreeId);
        });
    }
    async squashAndRebaseToMain(worktreeId, message) {
        const worktree = this.worktrees.get(worktreeId);
        if (!worktree) {
            throw new Error(`Unknown worktree ${worktreeId}`);
        }
        const queue = this.getQueue(worktree.repoPath);
        return queue.enqueue(async () => {
            const now = new Date().toISOString();
            const updated = {
                ...worktree,
                status: 'rebase',
                lastSquashedAt: now,
                updatedAt: now,
            };
            this.worktrees.set(worktreeId, updated);
            provenance_ledger_js_1.provenanceLedger.record('worktree-engine', 'squash-and-rebase', {
                worktreeId,
                message,
            });
            updated.status = 'ready';
            updated.updatedAt = new Date().toISOString();
            this.worktrees.set(worktreeId, { ...updated });
            return this.worktrees.get(worktreeId);
        });
    }
    async deleteQueued(worktreeId) {
        const worktree = this.worktrees.get(worktreeId);
        if (!worktree) {
            return;
        }
        const queue = this.getQueue(worktree.repoPath);
        await queue.enqueue(async () => {
            this.worktrees.set(worktreeId, { ...worktree, status: 'deleting' });
            provenance_ledger_js_1.provenanceLedger.record('worktree-engine', 'queue-delete', {
                worktreeId,
            });
            await fs_1.promises.rm(worktree.worktreePath, { recursive: true, force: true });
            this.worktrees.delete(worktreeId);
            provenance_ledger_js_1.provenanceLedger.record('worktree-engine', 'deleted', { worktreeId });
        });
    }
    async preview(command, args = []) {
        const sanitized = `${sanitizeCommand(command)} ${args.map(sanitizeCommand).join(' ')}`.trim();
        provenance_ledger_js_1.provenanceLedger.record('worktree-engine', 'preview', {
            command: sanitized,
        });
        return sanitized;
    }
    list() {
        return Array.from(this.worktrees.values());
    }
}
exports.WorktreeEngine = WorktreeEngine;
exports.worktreeEngine = new WorktreeEngine();
