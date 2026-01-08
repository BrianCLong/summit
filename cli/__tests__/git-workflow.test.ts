/**
 * Git Workflow Tests
 *
 * Tests for git-native atomic PR workflow functionality.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";
import {
  GitWorkflowError,
  createGitWorkflow,
  getGitStatus,
  isGitRepo,
  findRepoRoot,
  GIT_WORKFLOW_EXIT_CODE,
} from "../src/lib/git-workflow.js";

/**
 * Helper to execute git commands
 */
async function execGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => (stdout += data.toString()));
    proc.stderr?.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`git ${args.join(" ")} failed: ${stderr}`));
      }
    });
  });
}

describe("Git Workflow", () => {
  let tempDir: string;
  let repoRoot: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-workflow-test-"));
    repoRoot = path.join(tempDir, "repo");
    fs.mkdirSync(repoRoot);

    // Initialize git repo
    await execGit(["init"], repoRoot);
    await execGit(["config", "user.email", "test@test.com"], repoRoot);
    await execGit(["config", "user.name", "Test User"], repoRoot);

    // Create initial commit
    fs.writeFileSync(path.join(repoRoot, "README.md"), "# Test Repo");
    await execGit(["add", "README.md"], repoRoot);
    await execGit(["commit", "-m", "Initial commit"], repoRoot);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("isGitRepo", () => {
    it("returns true for git repository", async () => {
      expect(await isGitRepo(repoRoot)).toBe(true);
    });

    it("returns false for non-git directory", async () => {
      const nonGitDir = path.join(tempDir, "not-a-repo");
      fs.mkdirSync(nonGitDir);
      expect(await isGitRepo(nonGitDir)).toBe(false);
    });
  });

  describe("findRepoRoot", () => {
    it("finds repo root from subdirectory", async () => {
      const subDir = path.join(repoRoot, "src", "lib");
      fs.mkdirSync(subDir, { recursive: true });

      const found = await findRepoRoot(subDir);
      // Normalize both paths to handle macOS /var -> /private/var symlinks
      expect(fs.realpathSync(found!)).toBe(fs.realpathSync(repoRoot));
    });

    it("returns null for non-repo directory", async () => {
      const nonGitDir = path.join(tempDir, "not-a-repo");
      fs.mkdirSync(nonGitDir);

      const found = await findRepoRoot(nonGitDir);
      expect(found).toBeNull();
    });
  });

  describe("getGitStatus", () => {
    it("returns clean status for clean repo", async () => {
      const status = await getGitStatus(repoRoot);

      expect(status.isRepo).toBe(true);
      expect(status.branch).toBe("master");
      expect(status.isDirty).toBe(false);
      expect(status.staged).toEqual([]);
      expect(status.unstaged).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it("detects untracked files", async () => {
      fs.writeFileSync(path.join(repoRoot, "new-file.txt"), "content");

      const status = await getGitStatus(repoRoot);

      expect(status.isDirty).toBe(true);
      expect(status.untracked).toContain("new-file.txt");
    });

    it("detects staged changes", async () => {
      fs.writeFileSync(path.join(repoRoot, "staged.txt"), "content");
      await execGit(["add", "staged.txt"], repoRoot);

      const status = await getGitStatus(repoRoot);

      expect(status.isDirty).toBe(true);
      expect(status.staged.length).toBeGreaterThan(0);
    });

    it("detects unstaged changes", async () => {
      fs.writeFileSync(path.join(repoRoot, "README.md"), "# Modified");

      const status = await getGitStatus(repoRoot);

      expect(status.isDirty).toBe(true);
      expect(status.unstaged.length).toBeGreaterThan(0);
    });
  });

  describe("GitWorkflow", () => {
    describe("initialize", () => {
      it("succeeds for clean repo", async () => {
        const workflow = createGitWorkflow({ repoRoot });
        await expect(workflow.initialize()).resolves.toBeUndefined();
      });

      it("throws for non-git directory", async () => {
        const nonGitDir = path.join(tempDir, "not-a-repo");
        fs.mkdirSync(nonGitDir);

        const workflow = createGitWorkflow({ repoRoot: nonGitDir });

        await expect(workflow.initialize()).rejects.toThrow(GitWorkflowError);

        try {
          await workflow.initialize();
        } catch (error) {
          expect(error).toBeInstanceOf(GitWorkflowError);
          const gitError = error as GitWorkflowError;
          expect(gitError.reason).toBe("not_git_repo");
        }
      });

      it("throws for dirty repo when allowDirty is false", async () => {
        fs.writeFileSync(path.join(repoRoot, "dirty.txt"), "content");

        const workflow = createGitWorkflow({
          repoRoot,
          allowDirty: false,
        });

        await expect(workflow.initialize()).rejects.toThrow(GitWorkflowError);

        try {
          await workflow.initialize();
        } catch (error) {
          const gitError = error as GitWorkflowError;
          expect(gitError.reason).toBe("dirty_repo");
          expect(gitError.details).toContain("use_--allow-dirty_to_continue");
        }
      });

      it("succeeds for dirty repo when allowDirty is true", async () => {
        fs.writeFileSync(path.join(repoRoot, "dirty.txt"), "content");

        const workflow = createGitWorkflow({
          repoRoot,
          allowDirty: true,
        });

        await expect(workflow.initialize()).resolves.toBeUndefined();
      });
    });

    describe("createBranch", () => {
      it("creates new branch", async () => {
        const workflow = createGitWorkflow({ repoRoot });
        await workflow.initialize();

        await workflow.createBranch("feature/test");

        const status = workflow.getStatus();
        expect(status.branch).toBe("feature/test");
      });

      it("switches to existing branch", async () => {
        // Create branch first
        await execGit(["checkout", "-b", "existing-branch"], repoRoot);
        await execGit(["checkout", "master"], repoRoot);

        const workflow = createGitWorkflow({ repoRoot });
        await workflow.initialize();

        await workflow.createBranch("existing-branch");

        const status = workflow.getStatus();
        expect(status.branch).toBe("existing-branch");
      });
    });

    describe("stageFiles", () => {
      it("stages specified files", async () => {
        fs.writeFileSync(path.join(repoRoot, "file1.txt"), "content1");
        fs.writeFileSync(path.join(repoRoot, "file2.txt"), "content2");

        const workflow = createGitWorkflow({ repoRoot, allowDirty: true });
        await workflow.initialize();

        await workflow.stageFiles(["file1.txt"]);

        const status = workflow.getStatus();
        expect(status.staged).toContain("file1.txt");
        expect(status.untracked).toContain("file2.txt");
      });
    });

    describe("stageAll", () => {
      it("stages all changes", async () => {
        fs.writeFileSync(path.join(repoRoot, "file1.txt"), "content1");
        fs.writeFileSync(path.join(repoRoot, "file2.txt"), "content2");

        const workflow = createGitWorkflow({ repoRoot, allowDirty: true });
        await workflow.initialize();

        await workflow.stageAll();

        const status = workflow.getStatus();
        expect(status.staged.length).toBe(2);
        expect(status.untracked.length).toBe(0);
      });
    });

    describe("commit", () => {
      it("creates commit with message", async () => {
        fs.writeFileSync(path.join(repoRoot, "new-file.txt"), "content");

        const workflow = createGitWorkflow({ repoRoot, allowDirty: true });
        await workflow.initialize();

        await workflow.stageAll();
        const commitHash = await workflow.commit("Test commit message");

        expect(commitHash).toHaveLength(40); // Full SHA

        const status = workflow.getStatus();
        expect(status.isDirty).toBe(false);
      });

      it("throws when nothing staged", async () => {
        const workflow = createGitWorkflow({ repoRoot });
        await workflow.initialize();

        await expect(workflow.commit("Empty commit")).rejects.toThrow(GitWorkflowError);

        try {
          await workflow.commit("Empty commit");
        } catch (error) {
          const gitError = error as GitWorkflowError;
          expect(gitError.reason).toBe("nothing_staged");
        }
      });
    });

    describe("generateReview", () => {
      it("generates review artifact", async () => {
        // Create some commits on a feature branch
        await execGit(["checkout", "-b", "feature/test"], repoRoot);
        fs.writeFileSync(path.join(repoRoot, "feature.txt"), "feature content");
        await execGit(["add", "feature.txt"], repoRoot);
        await execGit(["commit", "-m", "Add feature"], repoRoot);

        const workflow = createGitWorkflow({ repoRoot });
        await workflow.initialize();

        const review = await workflow.generateReview("master");

        expect(review.branch).toBe("feature/test");
        expect(review.baseBranch).toBe("master");
        expect(review.commits.length).toBe(1);
        expect(review.commits[0].subject).toBe("Add feature");
        expect(review.filesChanged.length).toBe(1);
        expect(review.filesChanged[0].path).toBe("feature.txt");
        expect(review.filesChanged[0].status).toBe("added");
      });

      it("returns empty arrays when no changes", async () => {
        const workflow = createGitWorkflow({ repoRoot });
        await workflow.initialize();

        const review = await workflow.generateReview("master");

        expect(review.commits).toEqual([]);
        expect(review.filesChanged).toEqual([]);
      });
    });

    describe("writeReviewFile", () => {
      it("writes review.md file", async () => {
        await execGit(["checkout", "-b", "feature/review-test"], repoRoot);
        fs.writeFileSync(path.join(repoRoot, "test.txt"), "test");
        await execGit(["add", "test.txt"], repoRoot);
        await execGit(["commit", "-m", "Test commit"], repoRoot);

        const workflow = createGitWorkflow({ repoRoot });
        await workflow.initialize();

        const review = await workflow.generateReview("master");
        const reviewPath = await workflow.writeReviewFile(review);

        expect(fs.existsSync(reviewPath)).toBe(true);

        const content = fs.readFileSync(reviewPath, "utf-8");
        expect(content).toContain("# Review Summary");
        expect(content).toContain("feature/review-test");
        expect(content).toContain("Test commit");
      });

      it("writes to custom path", async () => {
        const workflow = createGitWorkflow({ repoRoot });
        await workflow.initialize();

        const review = await workflow.generateReview("master");
        const customPath = path.join(repoRoot, "docs", "my-review.md");
        const reviewPath = await workflow.writeReviewFile(review, customPath);

        expect(reviewPath).toBe(customPath);
        expect(fs.existsSync(customPath)).toBe(true);
      });
    });
  });

  describe("GitWorkflowError", () => {
    it("formats error with sorted details", () => {
      const error = new GitWorkflowError("Test error", "test_reason", [
        "detail_z",
        "detail_a",
        "detail_m",
      ]);

      const formatted = error.format();

      expect(formatted).toContain("Git Workflow Error: Test error");
      expect(formatted).toContain("Reason: test_reason");
      expect(formatted).toContain("Details:");

      // Details should be sorted
      const detailsSection = formatted.split("Details:")[1];
      const detailIndex = {
        a: detailsSection.indexOf("detail_a"),
        m: detailsSection.indexOf("detail_m"),
        z: detailsSection.indexOf("detail_z"),
      };
      expect(detailIndex.a).toBeLessThan(detailIndex.m);
      expect(detailIndex.m).toBeLessThan(detailIndex.z);
    });

    it("has correct exit code", () => {
      const error = new GitWorkflowError("Test", "reason", [], GIT_WORKFLOW_EXIT_CODE);
      expect(error.exitCode).toBe(2);
    });
  });
});
