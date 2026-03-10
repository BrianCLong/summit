/**
 * Repository Evidence Adapter
 *
 * Extracts evidence from git repositories (commits, PRs, issues, releases)
 */

import { BaseEvidenceAdapter, type EvidenceEvent, type AdapterConfig } from "../base-adapter.js";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Repository Query Parameters
 */
export interface RepoQuery {
  /**
   * Path to local git repository
   */
  repoPath: string;

  /**
   * Optional time range
   */
  since?: string; // ISO 8601
  until?: string; // ISO 8601

  /**
   * Optional branch filter
   */
  branch?: string;

  /**
   * What to extract
   */
  extract?: ("commits" | "files" | "tags" | "branches")[];

  /**
   * Optional file pattern filter
   */
  filePattern?: string;
}

/**
 * Repository Evidence Adapter
 */
export class RepoAdapter extends BaseEvidenceAdapter {
  constructor(config?: Partial<AdapterConfig>) {
    super({
      name: "repo-adapter",
      evidenceType: "repo",
      ...config,
    });
  }

  /**
   * Fetch evidence from git repository
   */
  async fetch(query: RepoQuery): Promise<EvidenceEvent[]> {
    const events: EvidenceEvent[] = [];

    // Validate repository exists
    if (!fs.existsSync(query.repoPath)) {
      throw new Error(`Repository not found: ${query.repoPath}`);
    }

    const gitDir = path.join(query.repoPath, ".git");
    if (!fs.existsSync(gitDir)) {
      throw new Error(`Not a git repository: ${query.repoPath}`);
    }

    const extractTypes = query.extract || ["commits"];

    // Extract commits
    if (extractTypes.includes("commits")) {
      const commits = await this.extractCommits(query);
      events.push(...commits);
    }

    // Extract files (current state)
    if (extractTypes.includes("files")) {
      const files = await this.extractFiles(query);
      events.push(...files);
    }

    // Extract tags
    if (extractTypes.includes("tags")) {
      const tags = await this.extractTags(query);
      events.push(...tags);
    }

    // Extract branches
    if (extractTypes.includes("branches")) {
      const branches = await this.extractBranches(query);
      events.push(...branches);
    }

    return events;
  }

  /**
   * Extract commit evidence
   */
  private async extractCommits(query: RepoQuery): Promise<EvidenceEvent[]> {
    const events: EvidenceEvent[] = [];

    try {
      // Build git log command
      let cmd = `cd "${query.repoPath}" && git log --pretty=format:"%H|%an|%ae|%at|%s|%b" --name-status`;

      if (query.since) {
        cmd += ` --since="${query.since}"`;
      }

      if (query.until) {
        cmd += ` --until="${query.until}"`;
      }

      if (query.branch) {
        cmd += ` ${query.branch}`;
      }

      if (query.filePattern) {
        cmd += ` -- ${query.filePattern}`;
      }

      const output = execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
      const lines = output.split("\n");

      let currentCommit: any = null;
      let currentFiles: string[] = [];

      for (const line of lines) {
        if (line.includes("|")) {
          // Commit line
          if (currentCommit) {
            // Save previous commit
            events.push(this.createCommitEvent(currentCommit, currentFiles, query.repoPath));
          }

          const [hash, author, email, timestamp, subject, body] = line.split("|");
          currentCommit = { hash, author, email, timestamp: parseInt(timestamp), subject, body };
          currentFiles = [];
        } else if (line.match(/^[AMD]\t/)) {
          // File change line
          const [status, file] = line.split("\t");
          currentFiles.push(`${status}:${file}`);
        }
      }

      // Save last commit
      if (currentCommit) {
        events.push(this.createCommitEvent(currentCommit, currentFiles, query.repoPath));
      }
    } catch (error) {
      console.error(`Error extracting commits: ${error}`);
    }

    return events;
  }

  /**
   * Create evidence event from commit
   */
  private createCommitEvent(commit: any, files: string[], repoPath: string): EvidenceEvent {
    const repoName = path.basename(repoPath);

    return {
      id: `commit-${commit.hash}`,
      type: "repo",
      source: `${repoName}@${commit.hash.substring(0, 7)}`,
      uri: `file://${repoPath}/.git/objects/${commit.hash.substring(0, 2)}/${commit.hash.substring(2)}`,
      observedAt: new Date(commit.timestamp * 1000).toISOString(),
      confidence: 1.0, // Git commits are definitive
      assertions: [
        {
          type: "temporal_event",
          subject: `commit-${commit.hash}`,
          predicate: "occurred_at",
          object: new Date(commit.timestamp * 1000).toISOString(),
          confidence: 1.0,
        },
        {
          type: "attribute_value",
          subject: `commit-${commit.hash}`,
          predicate: "author",
          object: commit.author,
          confidence: 1.0,
        },
        {
          type: "attribute_value",
          subject: `commit-${commit.hash}`,
          predicate: "message",
          object: commit.subject,
          confidence: 1.0,
        },
        {
          type: "attribute_value",
          subject: `commit-${commit.hash}`,
          predicate: "files_changed",
          object: files,
          confidence: 1.0,
        },
      ],
      rawMetadata: {
        hash: commit.hash,
        author: commit.author,
        email: commit.email,
        timestamp: commit.timestamp,
        subject: commit.subject,
        body: commit.body,
        files,
      },
    };
  }

  /**
   * Extract file evidence (current state)
   */
  private async extractFiles(query: RepoQuery): Promise<EvidenceEvent[]> {
    const events: EvidenceEvent[] = [];

    try {
      let cmd = `cd "${query.repoPath}" && git ls-files`;

      if (query.filePattern) {
        cmd += ` ${query.filePattern}`;
      }

      const output = execSync(cmd, { encoding: "utf-8" });
      const files = output.split("\n").filter(f => f.length > 0);

      const repoName = path.basename(query.repoPath);
      const now = new Date().toISOString();

      for (const file of files) {
        events.push({
          id: `file-${Buffer.from(file).toString("base64").substring(0, 16)}`,
          type: "repo",
          source: `${repoName}:${file}`,
          uri: `file://${path.join(query.repoPath, file)}`,
          observedAt: now,
          confidence: 1.0,
          assertions: [
            {
              type: "node_exists",
              subject: file,
              confidence: 1.0,
            },
          ],
          rawMetadata: {
            file,
            repoPath: query.repoPath,
          },
        });
      }
    } catch (error) {
      console.error(`Error extracting files: ${error}`);
    }

    return events;
  }

  /**
   * Extract tag evidence
   */
  private async extractTags(query: RepoQuery): Promise<EvidenceEvent[]> {
    const events: EvidenceEvent[] = [];

    try {
      const cmd = `cd "${query.repoPath}" && git tag -l --format="%(refname:short)|%(creatordate:iso8601)|%(taggername)|%(subject)"`;
      const output = execSync(cmd, { encoding: "utf-8" });
      const lines = output.split("\n").filter(l => l.length > 0);

      const repoName = path.basename(query.repoPath);

      for (const line of lines) {
        const [tag, date, tagger, subject] = line.split("|");

        events.push({
          id: `tag-${Buffer.from(tag).toString("base64").substring(0, 16)}`,
          type: "repo",
          source: `${repoName}@${tag}`,
          observedAt: date,
          confidence: 1.0,
          assertions: [
            {
              type: "temporal_event",
              subject: `tag-${tag}`,
              predicate: "release",
              object: tag,
              confidence: 1.0,
            },
          ],
          rawMetadata: {
            tag,
            date,
            tagger,
            subject,
            repoPath: query.repoPath,
          },
        });
      }
    } catch (error) {
      console.error(`Error extracting tags: ${error}`);
    }

    return events;
  }

  /**
   * Extract branch evidence
   */
  private async extractBranches(query: RepoQuery): Promise<EvidenceEvent[]> {
    const events: EvidenceEvent[] = [];

    try {
      const cmd = `cd "${query.repoPath}" && git branch -a`;
      const output = execSync(cmd, { encoding: "utf-8" });
      const branches = output.split("\n").filter(b => b.length > 0).map(b => b.trim().replace(/^\*\s+/, ""));

      const repoName = path.basename(query.repoPath);
      const now = new Date().toISOString();

      for (const branch of branches) {
        events.push({
          id: `branch-${Buffer.from(branch).toString("base64").substring(0, 16)}`,
          type: "repo",
          source: `${repoName}:${branch}`,
          observedAt: now,
          confidence: 1.0,
          assertions: [
            {
              type: "node_exists",
              subject: `branch-${branch}`,
              confidence: 1.0,
            },
          ],
          rawMetadata: {
            branch,
            repoPath: query.repoPath,
          },
        });
      }
    } catch (error) {
      console.error(`Error extracting branches: ${error}`);
    }

    return events;
  }
}
