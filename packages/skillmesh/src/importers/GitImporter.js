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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitImporter = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs-extra"));
const crypto = __importStar(require("crypto"));
const LocalSkillRegistry_1 = require("../registry/LocalSkillRegistry");
class GitImporter {
    cacheDir;
    constructor(cacheDir) {
        this.cacheDir = cacheDir || path.join(os.homedir(), '.skillmesh', 'cache', 'git');
    }
    getRepoDir(url) {
        const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 12);
        const repoName = url.split('/').pop()?.replace('.git', '') || 'repo';
        return path.join(this.cacheDir, `${repoName}-${hash}`);
    }
    async import(url, branch, subpath) {
        await fs.ensureDir(this.cacheDir);
        const cloneDir = this.getRepoDir(url);
        const git = (0, simple_git_1.default)();
        if (await fs.pathExists(cloneDir)) {
            console.log(`Repo cached at ${cloneDir}, updating...`);
            try {
                await git.cwd(cloneDir).pull();
                if (branch) {
                    await git.cwd(cloneDir).checkout(branch);
                }
            }
            catch (e) {
                console.warn(`Failed to update cache at ${cloneDir}, trying to re-clone. Error: ${e}`);
                await fs.remove(cloneDir);
                await git.clone(url, cloneDir);
                if (branch) {
                    await git.cwd(cloneDir).checkout(branch);
                }
            }
        }
        else {
            console.log(`Cloning ${url} to ${cloneDir}...`);
            await git.clone(url, cloneDir);
            if (branch) {
                await git.cwd(cloneDir).checkout(branch);
            }
        }
        // Now look for skills
        // Logic: if subpath is provided, look there.
        // If not, look for manifest.json at root.
        // If not at root, maybe scan subdirectories (Skills Hub does multi-skill selection).
        const skills = [];
        const searchPath = subpath ? path.join(cloneDir, subpath) : cloneDir;
        // Check if searchPath has a manifest.json
        if (await fs.pathExists(path.join(searchPath, 'manifest.json'))) {
            const skill = await LocalSkillRegistry_1.LocalSkillRegistry.createSkillFromPath(searchPath, {
                type: 'git',
                url,
                path: subpath || '.',
                commit: (await git.cwd(cloneDir).revparse(['HEAD'])).trim()
            });
            skills.push(skill);
        }
        else {
            // Scan immediate subdirectories
            if (await fs.pathExists(searchPath)) {
                const entries = await fs.readdir(searchPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const subDir = path.join(searchPath, entry.name);
                        if (await fs.pathExists(path.join(subDir, 'manifest.json'))) {
                            try {
                                const skill = await LocalSkillRegistry_1.LocalSkillRegistry.createSkillFromPath(subDir, {
                                    type: 'git',
                                    url,
                                    path: path.join(subpath || '.', entry.name),
                                    commit: (await git.cwd(cloneDir).revparse(['HEAD'])).trim()
                                });
                                skills.push(skill);
                            }
                            catch (e) {
                                console.warn(`Skipping invalid skill in ${subDir}: ${e}`);
                            }
                        }
                    }
                }
            }
            else {
                console.warn(`Path ${searchPath} does not exist in repo.`);
            }
        }
        return skills;
    }
}
exports.GitImporter = GitImporter;
