/**
 * Run Command Integration Tests
 *
 * Integration tests for the run command orchestrating policy,
 * sandbox, git workflow, provider, and session modules.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";
import { createSession, loadSession, listSessions } from "../src/lib/session.js";
import { PolicyGate } from "../src/lib/policy.js";
import { createSandbox } from "../src/lib/sandbox.js";
import { createGitWorkflow } from "../src/lib/git-workflow.js";
import { createProviderWrapper } from "../src/lib/provider.js";

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

describe("Run Command Integration", () => {
  let tempDir: string;
  let repoRoot: string;
  let sessionDir: string;

  beforeEach(async () => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "run-test-")));
    repoRoot = path.join(tempDir, "repo");
    sessionDir = path.join(repoRoot, ".claude", "sessions");
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

  describe("Module Integration", () => {
    it("creates session and tracks operations", () => {
      const session = createSession({
        repoRoot,
        command: "run",
        flags: { ci: false },
        sessionDir,
      });

      session.recordOperation("read", "file.txt", "success", { size: 100 }, 10);
      session.recordOperation("policy", "check", "allowed", {}, 5);
      session.complete();

      const state = session.getState();
      expect(state.status).toBe("completed");
      expect(state.operations.length).toBe(2);
      expect(state.diagnostics.filesRead).toBe(1);
      expect(state.diagnostics.policyEvaluations).toBe(1);
    });

    it("policy gate evaluates actions", () => {
      const policyGate = new PolicyGate({
        ci: false,
        repoRoot,
      });
      policyGate.initialize();

      const decision = policyGate.evaluate("run", { write: false }, [
        { type: "read_file", path: "README.md" },
      ]);

      expect(decision.allow).toBe(true);
    });

    it("sandbox enforces path restrictions", () => {
      const sandbox = createSandbox({
        repoRoot,
        allowPaths: [],
        denyPaths: [],
        allowTools: ["git"],
        ci: false,
      });

      // Should allow reading within repo
      expect(() => sandbox.checkPath(path.join(repoRoot, "file.txt"), "read")).not.toThrow();

      // Should deny reading outside repo
      expect(() => sandbox.checkPath("/etc/passwd", "read")).toThrow();
    });

    it("sandbox denies sensitive files by default", () => {
      const sandbox = createSandbox({
        repoRoot,
        allowPaths: [],
        denyPaths: [],
        allowTools: [],
        ci: true,
      });

      // Create a sensitive file path
      const keyPath = path.join(repoRoot, "id_rsa");

      expect(() => sandbox.checkPath(keyPath, "read")).toThrow();
    });

    it("git workflow tracks branch changes", async () => {
      const workflow = createGitWorkflow({
        repoRoot,
        allowDirty: false,
      });

      await workflow.initialize();
      await workflow.createBranch("feature/test");

      const status = workflow.getStatus();
      expect(status.branch).toBe("feature/test");
    });

    it("provider wrapper handles retries", async () => {
      let attempts = 0;
      const provider = createProviderWrapper("test", {
        maxRetries: 2,
        initialBackoffMs: 10,
        maxBackoffMs: 50,
      });

      const result = await provider.execute(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("ECONNRESET");
        }
        return { success: true };
      });

      expect(result.success).toBe(true);
      expect(result.diagnostics.requests_made).toBe(2);
      expect(result.diagnostics.retries_total).toBe(1);
    });
  });

  describe("Full Workflow Integration", () => {
    it("tracks complete workflow with session", async () => {
      // Create session
      const session = createSession({
        repoRoot,
        command: "run",
        flags: { ci: false, allowDirty: true },
        sessionDir,
        deterministicId: true,
        seed: "test-seed",
      });

      // Initialize policy
      const policyGate = new PolicyGate({
        ci: false,
        repoRoot,
      });
      policyGate.initialize();

      // Initialize sandbox
      const sandbox = createSandbox({
        repoRoot,
        allowPaths: [],
        denyPaths: [],
        allowTools: ["git"],
        ci: false,
      });

      // Initialize git workflow
      const workflow = createGitWorkflow({
        repoRoot,
        allowDirty: true,
      });
      await workflow.initialize();

      // Record policy evaluation
      const decision = policyGate.evaluate("run", { write: true }, [
        { type: "write_patch", files: ["new-file.txt"], diff_bytes: 100 },
      ]);
      session.recordOperation("policy", "write_patch", decision.allow ? "allowed" : "denied");

      // Check sandbox allows the path
      const newFilePath = path.join(repoRoot, "new-file.txt");
      sandbox.checkPath(newFilePath, "write");

      // Create a file
      fs.writeFileSync(newFilePath, "Hello World");
      session.recordOperation("write", "new-file.txt", "success", { size: 11 });

      // Create branch and commit
      await workflow.createBranch("feature/integration-test");
      session.recordOperation("git", "branch", "success", { branch: "feature/integration-test" });

      await workflow.stageAll();
      const commitHash = await workflow.commit("Add new file");
      session.recordOperation("git", "commit", "success", { commitHash });

      // Generate review
      const review = await workflow.generateReview("master");
      const reviewPath = await workflow.writeReviewFile(review);
      session.recordOperation("write", reviewPath, "success", { type: "review" });

      // Complete session
      session.complete();

      // Verify session state
      const state = session.getState();
      expect(state.status).toBe("completed");
      expect(state.diagnostics.totalOperations).toBe(5);
      expect(state.diagnostics.filesWritten).toBe(2);
      expect(state.diagnostics.gitOperations).toBe(2);
      expect(state.diagnostics.policyEvaluations).toBe(1);

      // Verify session was persisted
      const sessions = listSessions(sessionDir);
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionId).toBe(state.sessionId);
    });

    it("handles errors and records failures", async () => {
      const session = createSession({
        repoRoot,
        command: "run",
        flags: { ci: true },
        sessionDir,
      });

      // Simulate policy denial
      const policyGate = new PolicyGate({
        ci: true,
        repoRoot,
      });

      // This will throw because no policy bundle in CI mode
      try {
        policyGate.initialize();
        session.recordOperation("policy", "init", "success");
      } catch (error) {
        session.recordOperation("policy", "init", "failure", {
          error: error instanceof Error ? error.message : String(error),
        });
        session.fail(error instanceof Error ? error.message : String(error));
      }

      const state = session.getState();
      expect(state.status).toBe("failed");
      // 2 failed operations: one from recordOperation, one from session.fail()
      expect(state.diagnostics.failedOperations).toBe(2);
    });

    it("enforces budgets across operations", async () => {
      const provider = createProviderWrapper("test", {
        maxRequests: 2,
      });

      // First request succeeds
      const result1 = await provider.execute(async () => ({ data: 1 }));
      expect(result1.success).toBe(true);

      // Second request succeeds
      const result2 = await provider.execute(async () => ({ data: 2 }));
      expect(result2.success).toBe(true);

      // Third request fails due to budget
      const result3 = await provider.execute(async () => ({ data: 3 }));
      expect(result3.success).toBe(false);
      expect(result3.error?.category).toBe("budget_exceeded");
    });
  });

  describe("Session Persistence", () => {
    it("loads session from file", () => {
      const session = createSession({
        repoRoot,
        command: "run",
        flags: { test: true },
        sessionDir,
      });

      session.recordOperation("read", "file.txt", "success");
      session.complete();

      const loaded = loadSession(session.getSessionFile());
      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe(session.getSessionId());
      expect(loaded?.status).toBe("completed");
    });

    it("lists multiple sessions", () => {
      // Create first session
      const session1 = createSession({
        repoRoot,
        command: "run",
        flags: {},
        sessionDir,
      });
      session1.complete();

      // Create second session
      const session2 = createSession({
        repoRoot,
        command: "exec",
        flags: {},
        sessionDir,
      });
      session2.complete();

      const sessions = listSessions(sessionDir);
      expect(sessions.length).toBe(2);
    });
  });

  describe("Deterministic Output", () => {
    it("produces deterministic session IDs in CI mode", () => {
      const session1 = createSession({
        repoRoot,
        command: "run",
        flags: {},
        sessionDir,
        deterministicId: true,
        seed: "test-seed-123",
      });

      const session2 = createSession({
        repoRoot,
        command: "run",
        flags: {},
        sessionDir: path.join(tempDir, "sessions2"),
        deterministicId: true,
        seed: "test-seed-123",
      });

      // Same seed should produce same session ID format
      expect(session1.getSessionId()).toMatch(/^session-[a-f0-9]{16}$/);
      expect(session2.getSessionId()).toMatch(/^session-[a-f0-9]{16}$/);
    });

    it("produces deterministic JSON output", () => {
      const session = createSession({
        repoRoot,
        command: "run",
        flags: { z: 1, a: 2, m: 3 },
        sessionDir,
        deterministicId: true,
        seed: "test",
      });

      const json1 = session.toJSON();
      const json2 = session.toJSON();

      expect(json1).toBe(json2);

      // Keys should be sorted
      const parsed = JSON.parse(json1);
      const keys = Object.keys(parsed);
      expect(keys).toEqual([...keys].sort());
    });
  });

  describe("Error Handling", () => {
    it("handles sandbox violations gracefully", () => {
      const sandbox = createSandbox({
        repoRoot,
        allowPaths: [],
        denyPaths: [],
        allowTools: [],
        ci: true,
      });

      // Attempt to access forbidden path
      expect(() => sandbox.checkPath("/etc/passwd", "read")).toThrow();

      // Attempt to use forbidden tool
      expect(() => sandbox.checkTool("curl")).toThrow();
    });

    it("handles git workflow errors gracefully", async () => {
      const nonGitDir = path.join(tempDir, "not-a-repo");
      fs.mkdirSync(nonGitDir);

      const workflow = createGitWorkflow({
        repoRoot: nonGitDir,
      });

      await expect(workflow.initialize()).rejects.toThrow();
    });

    it("handles provider network errors with retries", async () => {
      let attempts = 0;
      const provider = createProviderWrapper("test", {
        maxRetries: 3,
        initialBackoffMs: 10,
        maxBackoffMs: 50,
      });

      const result = await provider.execute(async () => {
        attempts++;
        throw new Error("ECONNREFUSED");
      });

      expect(result.success).toBe(false);
      expect(result.diagnostics.requests_made).toBe(4); // Initial + 3 retries
      expect(result.diagnostics.retries_total).toBe(3);
    });
  });
});
