import simpleGit from 'simple-git';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import { Skill, SkillSource } from '../core/types';
import { LocalSkillRegistry } from '../registry/LocalSkillRegistry';

export class GitImporter {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(os.homedir(), '.skillmesh', 'cache', 'git');
  }

  private getRepoDir(url: string): string {
    const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 12);
    const repoName = url.split('/').pop()?.replace('.git', '') || 'repo';
    return path.join(this.cacheDir, `${repoName}-${hash}`);
  }

  async import(url: string, branch?: string, subpath?: string): Promise<Skill[]> {
    await fs.ensureDir(this.cacheDir);

    const cloneDir = this.getRepoDir(url);
    const git = simpleGit();

    if (await fs.pathExists(cloneDir)) {
      console.log(`Repo cached at ${cloneDir}, updating...`);
      try {
        await git.cwd(cloneDir).pull();
        if (branch) {
          await git.cwd(cloneDir).checkout(branch);
        }
      } catch (e) {
        console.warn(`Failed to update cache at ${cloneDir}, trying to re-clone. Error: ${e}`);
        await fs.remove(cloneDir);
        await git.clone(url, cloneDir);
        if (branch) {
          await git.cwd(cloneDir).checkout(branch);
        }
      }
    } else {
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

    const skills: Skill[] = [];
    const searchPath = subpath ? path.join(cloneDir, subpath) : cloneDir;

    // Check if searchPath has a manifest.json
    if (await fs.pathExists(path.join(searchPath, 'manifest.json'))) {
      const skill = await LocalSkillRegistry.createSkillFromPath(searchPath, {
        type: 'git',
        url,
        path: subpath || '.',
        commit: (await git.cwd(cloneDir).revparse(['HEAD'])).trim()
      });
      skills.push(skill);
    } else {
      // Scan immediate subdirectories
      if (await fs.pathExists(searchPath)) {
        const entries = await fs.readdir(searchPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDir = path.join(searchPath, entry.name);
            if (await fs.pathExists(path.join(subDir, 'manifest.json'))) {
               try {
                 const skill = await LocalSkillRegistry.createSkillFromPath(subDir, {
                   type: 'git',
                   url,
                   path: path.join(subpath || '.', entry.name),
                   commit: (await git.cwd(cloneDir).revparse(['HEAD'])).trim()
                 });
                 skills.push(skill);
               } catch (e) {
                 console.warn(`Skipping invalid skill in ${subDir}: ${e}`);
               }
            }
          }
        }
      } else {
        console.warn(`Path ${searchPath} does not exist in repo.`);
      }
    }

    return skills;
  }
}
