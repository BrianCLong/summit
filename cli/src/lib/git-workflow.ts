/**
 * Git Workflow Module
 *
 * Provides git-native atomic PR workflow functionality:
 * - Repo detection and status checking
 * - Dirty repo handling
 * - Branch creation and management
 * - Commit helper with message formatting
 * - Review.md artifact generation
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

// Exit code for git workflow errors
export const GIT_WORKFLOW_EXIT_CODE = 2;

/**
 * Git status information
 */
export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  isDirty: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  remoteRef: string | null;
}

/**
 * Git workflow options
 */
export interface GitWorkflowOptions {
  repoRoot: string;
  allowDirty: boolean;
  branch?: string;
  commit: boolean;
  commitMessage?: string;
  generateReview: boolean;
  reviewPath?: string;
}

/**
 * Review artifact data
 */
export interface ReviewArtifact {
  timestamp: string;
  branch: string;
  baseBranch: string;
  commits: CommitInfo[];
  filesChanged: FileChange[];
  summary: string;
}

/**
 * Commit information
 */
export interface CommitInfo {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  date: string;
}

/**
 * File change information
 */
export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
}

/**
 * Git workflow error
 */
export class GitWorkflowError extends Error {
  constructor(
    message: string,
    public reason: string,
    public details: string[] = [],
    public exitCode: number = GIT_WORKFLOW_EXIT_CODE
  ) {
    super(message);
    this.name = "GitWorkflowError";
  }

  format(): string {
    const sortedDetails = [...this.details].sort();
    let output = `Git Workflow Error: ${this.message}`;
    output += `\nReason: ${this.reason}`;
    if (sortedDetails.length > 0) {
      output += "\nDetails:";
      for (const detail of sortedDetails) {
        output += `\n  - ${detail}`;
      }
    }
    return output;
  }
}

/**
 * Execute a git command and return the output
 */
async function execGit(
  args: string[],
  cwd: string,
  _options: { ignoreErrors?: boolean } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn("git", args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (proc.stdout) {
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    proc.on("close", (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err) => {
      resolve({
        stdout: "",
        stderr: err.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * Detect if a directory is a git repository
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  const result = await execGit(["rev-parse", "--is-inside-work-tree"], dir);
  return result.exitCode === 0 && result.stdout === "true";
}

/**
 * Find the git repository root from a directory
 */
export async function findRepoRoot(startDir: string): Promise<string | null> {
  const result = await execGit(["rev-parse", "--show-toplevel"], startDir);
  if (result.exitCode === 0) {
    return result.stdout;
  }
  return null;
}

/**
 * Get current git status
 */
export async function getGitStatus(repoRoot: string): Promise<GitStatus> {
  // Check if it's a repo
  if (!(await isGitRepo(repoRoot))) {
    return {
      isRepo: false,
      branch: null,
      isDirty: false,
      staged: [],
      unstaged: [],
      untracked: [],
      ahead: 0,
      behind: 0,
      remoteRef: null,
    };
  }

  // Get current branch
  const branchResult = await execGit(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
  const branch = branchResult.exitCode === 0 ? branchResult.stdout : null;

  // Get status with porcelain v2 for machine parsing
  const statusResult = await execGit(["status", "--porcelain=v2", "--branch"], repoRoot);

  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  let ahead = 0;
  let behind = 0;
  let remoteRef: string | null = null;

  for (const line of statusResult.stdout.split("\n")) {
    if (line.startsWith("# branch.ab")) {
      // Parse ahead/behind: # branch.ab +1 -2
      const match = line.match(/\+(\d+) -(\d+)/);
      if (match) {
        ahead = parseInt(match[1], 10);
        behind = parseInt(match[2], 10);
      }
    } else if (line.startsWith("# branch.upstream")) {
      remoteRef = line.split(" ")[2] || null;
    } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      // Changed entry
      const parts = line.split(" ");
      const xy = parts[1];
      const filePath = parts.slice(8).join(" ");

      if (xy[0] !== ".") {
        staged.push(filePath);
      }
      if (xy[1] !== ".") {
        unstaged.push(filePath);
      }
    } else if (line.startsWith("? ")) {
      // Untracked file
      untracked.push(line.slice(2));
    }
  }

  const isDirty = staged.length > 0 || unstaged.length > 0 || untracked.length > 0;

  return {
    isRepo: true,
    branch,
    isDirty,
    staged: staged.sort(),
    unstaged: unstaged.sort(),
    untracked: untracked.sort(),
    ahead,
    behind,
    remoteRef,
  };
}

/**
 * Git Workflow class - main workflow implementation
 */
export class GitWorkflow {
  private options: GitWorkflowOptions;
  private status: GitStatus | null = null;

  constructor(options: GitWorkflowOptions) {
    this.options = options;
  }

  /**
   * Initialize and validate the workflow
   */
  async initialize(): Promise<void> {
    this.status = await getGitStatus(this.options.repoRoot);

    // Must be a git repo
    if (!this.status.isRepo) {
      throw new GitWorkflowError("Not a git repository", "not_git_repo", [
        `path: ${this.options.repoRoot}`,
      ]);
    }

    // Check dirty state unless allowed
    if (this.status.isDirty && !this.options.allowDirty) {
      throw new GitWorkflowError("Repository has uncommitted changes", "dirty_repo", [
        `staged: ${this.status.staged.length}`,
        `unstaged: ${this.status.unstaged.length}`,
        `untracked: ${this.status.untracked.length}`,
        "use_--allow-dirty_to_continue",
      ]);
    }
  }

  /**
   * Get current status
   */
  getStatus(): GitStatus {
    if (!this.status) {
      throw new GitWorkflowError("Workflow not initialized", "not_initialized", [
        "call_initialize_first",
      ]);
    }
    return this.status;
  }

  /**
   * Create or switch to a branch
   */
  async createBranch(branchName: string): Promise<void> {
    // Check if branch exists
    const checkResult = await execGit(
      ["rev-parse", "--verify", branchName],
      this.options.repoRoot,
      { ignoreErrors: true }
    );

    if (checkResult.exitCode === 0) {
      // Branch exists, switch to it
      const switchResult = await execGit(["checkout", branchName], this.options.repoRoot);
      if (switchResult.exitCode !== 0) {
        throw new GitWorkflowError(
          `Failed to switch to branch: ${branchName}`,
          "branch_switch_failed",
          [`error: ${switchResult.stderr}`]
        );
      }
    } else {
      // Create new branch
      const createResult = await execGit(["checkout", "-b", branchName], this.options.repoRoot);
      if (createResult.exitCode !== 0) {
        throw new GitWorkflowError(
          `Failed to create branch: ${branchName}`,
          "branch_create_failed",
          [`error: ${createResult.stderr}`]
        );
      }
    }

    // Update status
    this.status = await getGitStatus(this.options.repoRoot);
  }

  /**
   * Stage files
   */
  async stageFiles(files: string[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const result = await execGit(["add", "--", ...files], this.options.repoRoot);
    if (result.exitCode !== 0) {
      throw new GitWorkflowError("Failed to stage files", "stage_failed", [
        `error: ${result.stderr}`,
      ]);
    }

    // Update status
    this.status = await getGitStatus(this.options.repoRoot);
  }

  /**
   * Stage all changes
   */
  async stageAll(): Promise<void> {
    const result = await execGit(["add", "-A"], this.options.repoRoot);
    if (result.exitCode !== 0) {
      throw new GitWorkflowError("Failed to stage all files", "stage_all_failed", [
        `error: ${result.stderr}`,
      ]);
    }

    // Update status
    this.status = await getGitStatus(this.options.repoRoot);
  }

  /**
   * Create a commit with the given message
   */
  async commit(message: string): Promise<string> {
    // Check if there are staged changes
    const status = await getGitStatus(this.options.repoRoot);
    if (status.staged.length === 0) {
      throw new GitWorkflowError("No staged changes to commit", "nothing_staged", [
        "stage_files_before_commit",
      ]);
    }

    const result = await execGit(["commit", "-m", message], this.options.repoRoot);
    if (result.exitCode !== 0) {
      throw new GitWorkflowError("Commit failed", "commit_failed", [`error: ${result.stderr}`]);
    }

    // Get the commit hash
    const hashResult = await execGit(["rev-parse", "HEAD"], this.options.repoRoot);
    const commitHash = hashResult.stdout;

    // Update status
    this.status = await getGitStatus(this.options.repoRoot);

    return commitHash;
  }

  /**
   * Get commits between base branch and current branch
   */
  async getCommitsSince(baseBranch: string): Promise<CommitInfo[]> {
    const result = await execGit(
      ["log", `${baseBranch}..HEAD`, "--format=%H|%h|%s|%an|%ai"],
      this.options.repoRoot
    );

    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }

    return result.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, subject, author, date] = line.split("|");
        return { hash, shortHash, subject, author, date };
      });
  }

  /**
   * Get file changes between base branch and current branch
   */
  async getFileChangesSince(baseBranch: string): Promise<FileChange[]> {
    const result = await execGit(
      ["diff", "--numstat", `${baseBranch}...HEAD`],
      this.options.repoRoot
    );

    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }

    const statusResult = await execGit(
      ["diff", "--name-status", `${baseBranch}...HEAD`],
      this.options.repoRoot
    );

    const statusMap = new Map<string, string>();
    for (const line of statusResult.stdout.split("\n").filter(Boolean)) {
      const [status, ...pathParts] = line.split("\t");
      const filePath = pathParts.join("\t");
      statusMap.set(filePath, status);
    }

    return result.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [add, del, ...pathParts] = line.split("\t");
        const filePath = pathParts.join("\t");
        const statusCode = statusMap.get(filePath) || "M";

        let status: FileChange["status"] = "modified";
        if (statusCode.startsWith("A")) status = "added";
        else if (statusCode.startsWith("D")) status = "deleted";
        else if (statusCode.startsWith("R")) status = "renamed";

        return {
          path: filePath,
          status,
          additions: add === "-" ? 0 : parseInt(add, 10),
          deletions: del === "-" ? 0 : parseInt(del, 10),
        };
      });
  }

  /**
   * Generate review.md artifact
   */
  async generateReview(baseBranch: string = "main"): Promise<ReviewArtifact> {
    const status = this.getStatus();
    const commits = await this.getCommitsSince(baseBranch);
    const filesChanged = await this.getFileChangesSince(baseBranch);

    // Generate summary
    const totalAdditions = filesChanged.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = filesChanged.reduce((sum, f) => sum + f.deletions, 0);

    const summary = [
      `${commits.length} commit(s)`,
      `${filesChanged.length} file(s) changed`,
      `+${totalAdditions} -${totalDeletions}`,
    ].join(", ");

    return {
      timestamp: new Date().toISOString(),
      branch: status.branch || "unknown",
      baseBranch,
      commits,
      filesChanged,
      summary,
    };
  }

  /**
   * Write review.md file
   */
  async writeReviewFile(review: ReviewArtifact, outputPath: string = "review.md"): Promise<string> {
    const absolutePath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(this.options.repoRoot, outputPath);

    // Ensure parent directory exists
    const parentDir = path.dirname(absolutePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const content = this.formatReviewMarkdown(review);
    fs.writeFileSync(absolutePath, content);
    return absolutePath;
  }

  /**
   * Format review artifact as markdown
   */
  private formatReviewMarkdown(review: ReviewArtifact): string {
    const lines: string[] = [
      "# Review Summary",
      "",
      `**Generated:** ${review.timestamp}`,
      `**Branch:** ${review.branch}`,
      `**Base:** ${review.baseBranch}`,
      `**Summary:** ${review.summary}`,
      "",
      "## Commits",
      "",
    ];

    if (review.commits.length === 0) {
      lines.push("_No commits_");
    } else {
      for (const commit of review.commits) {
        lines.push(`- \`${commit.shortHash}\` ${commit.subject} (${commit.author})`);
      }
    }

    lines.push("", "## Files Changed", "");

    if (review.filesChanged.length === 0) {
      lines.push("_No files changed_");
    } else {
      lines.push("| Status | File | Changes |");
      lines.push("|--------|------|---------|");
      for (const file of review.filesChanged) {
        const statusIcon =
          file.status === "added"
            ? "+"
            : file.status === "deleted"
              ? "-"
              : file.status === "renamed"
                ? "R"
                : "M";
        lines.push(`| ${statusIcon} | ${file.path} | +${file.additions} -${file.deletions} |`);
      }
    }

    lines.push("");
    return lines.join("\n");
  }

  /**
   * Push to remote
   */
  async push(remote: string = "origin", setUpstream: boolean = true): Promise<void> {
    const status = this.getStatus();
    const args = ["push"];

    if (setUpstream && !status.remoteRef) {
      args.push("-u", remote, status.branch || "HEAD");
    } else {
      args.push(remote);
    }

    const result = await execGit(args, this.options.repoRoot);
    if (result.exitCode !== 0) {
      throw new GitWorkflowError("Push failed", "push_failed", [`error: ${result.stderr}`]);
    }

    // Update status
    this.status = await getGitStatus(this.options.repoRoot);
  }
}

/**
 * Default git workflow options
 */
export const DEFAULT_GIT_WORKFLOW_OPTIONS: Partial<GitWorkflowOptions> = {
  allowDirty: false,
  commit: false,
  generateReview: false,
};

/**
 * Create git workflow with options merged with defaults
 */
export function createGitWorkflow(
  options: Partial<GitWorkflowOptions> & { repoRoot: string }
): GitWorkflow {
  const fullOptions: GitWorkflowOptions = {
    ...DEFAULT_GIT_WORKFLOW_OPTIONS,
    ...options,
  } as GitWorkflowOptions;

  return new GitWorkflow(fullOptions);
}
