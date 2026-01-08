/**
 * Sandbox Guardrails Tests
 *
 * Tests for path allowlist, tool execution, and network restrictions.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  SandboxError,
  createSandbox,
  matchesGlob,
  normalizePath,
  isPathWithin,
  scrubEnvironment,
  detectRepoRoot,
  SANDBOX_EXIT_CODE,
  HARDCODED_DENY_PATTERNS,
} from "../src/lib/sandbox.js";

describe("Sandbox Guardrails", () => {
  let tempDir: string;
  let repoRoot: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-test-"));
    repoRoot = path.join(tempDir, "repo");
    fs.mkdirSync(repoRoot);

    // Create some test files
    fs.writeFileSync(path.join(repoRoot, "allowed.txt"), "allowed content");
    fs.mkdirSync(path.join(repoRoot, "src"));
    fs.writeFileSync(path.join(repoRoot, "src", "index.ts"), "export {}");

    // Create .git directory (should be denied)
    fs.mkdirSync(path.join(repoRoot, ".git"));
    fs.writeFileSync(path.join(repoRoot, ".git", "config"), "git config");

    // Create a secrets file (should be denied)
    fs.mkdirSync(path.join(repoRoot, "secrets"));
    fs.writeFileSync(path.join(repoRoot, "secrets", "api.key"), "secret");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("matchesGlob", () => {
    it("matches simple patterns", () => {
      expect(matchesGlob("test.txt", "*.txt")).toBe(true);
      expect(matchesGlob("test.js", "*.txt")).toBe(false);
    });

    it("matches ** patterns", () => {
      expect(matchesGlob("src/lib/test.ts", "**/*.ts")).toBe(true);
      expect(matchesGlob(".git/config", ".git/**")).toBe(true);
      expect(matchesGlob(".git/hooks/pre-commit", ".git/**")).toBe(true);
    });

    it("matches exact patterns", () => {
      expect(matchesGlob(".env", "**/.env")).toBe(true);
      expect(matchesGlob("config/.env", "**/.env")).toBe(true);
    });

    it("matches key file patterns", () => {
      expect(matchesGlob("id_rsa", "**/id_rsa*")).toBe(true);
      expect(matchesGlob("home/.ssh/id_rsa.pub", "**/id_rsa*")).toBe(true);
    });
  });

  describe("normalizePath", () => {
    it("resolves relative paths against base", () => {
      const result = normalizePath("src/test.ts", repoRoot);
      expect(result).toBe(path.join(repoRoot, "src", "test.ts"));
    });

    it("keeps absolute paths absolute", () => {
      const absPath = "/absolute/path/test.ts";
      const result = normalizePath(absPath, repoRoot);
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe("isPathWithin", () => {
    it("returns true for paths within base", () => {
      expect(isPathWithin(path.join(repoRoot, "src"), repoRoot)).toBe(true);
      expect(isPathWithin(path.join(repoRoot, "src", "test.ts"), repoRoot)).toBe(true);
    });

    it("returns false for paths outside base", () => {
      expect(isPathWithin("/other/path", repoRoot)).toBe(false);
      expect(isPathWithin(path.join(tempDir, "other"), repoRoot)).toBe(false);
    });

    it("returns true for the base itself", () => {
      expect(isPathWithin(repoRoot, repoRoot)).toBe(true);
    });
  });

  describe("scrubEnvironment", () => {
    it("preserves safe environment variables", () => {
      const env = {
        PATH: "/usr/bin",
        HOME: "/home/user",
        SECRET_KEY: "should-be-removed",
      };

      const scrubbed = scrubEnvironment(env);

      expect(scrubbed.PATH).toBe("/usr/bin");
      expect(scrubbed.HOME).toBe("/home/user");
    });

    it("removes secret-pattern variables", () => {
      const env = {
        PATH: "/usr/bin",
        API_KEY: "secret",
        DATABASE_PASSWORD: "secret",
        AUTH_TOKEN: "secret",
        PRIVATE_KEY: "secret",
      };

      const scrubbed = scrubEnvironment(env);

      expect(scrubbed.API_KEY).toBeUndefined();
      expect(scrubbed.DATABASE_PASSWORD).toBeUndefined();
      expect(scrubbed.AUTH_TOKEN).toBeUndefined();
      expect(scrubbed.PRIVATE_KEY).toBeUndefined();
    });
  });

  describe("Sandbox", () => {
    describe("path checks", () => {
      it("allows reading files inside repo root", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.checkPath("allowed.txt", "read")).not.toThrow();
        expect(() => sandbox.checkPath("src/index.ts", "read")).not.toThrow();
      });

      it("denies reading files outside repo root", () => {
        const sandbox = createSandbox({ repoRoot });
        const outsidePath = path.join(tempDir, "outside.txt");
        fs.writeFileSync(outsidePath, "outside content");

        expect(() => sandbox.checkPath(outsidePath, "read")).toThrow(SandboxError);

        try {
          sandbox.checkPath(outsidePath, "read");
          fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(SandboxError);
          const sandboxError = error as SandboxError;
          expect(sandboxError.exitCode).toBe(SANDBOX_EXIT_CODE);
          expect(sandboxError.violationType).toBe("path");
        }
      });

      it("denies access to .git even if within repo root", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.checkPath(".git/config", "read")).toThrow(SandboxError);

        try {
          sandbox.checkPath(".git/config", "read");
        } catch (error) {
          const sandboxError = error as SandboxError;
          expect(sandboxError.details).toContain("matched_pattern: .git/**");
        }
      });

      it("denies access to secrets directory", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.checkPath("secrets/api.key", "read")).toThrow(SandboxError);
      });

      it("denies access to .pem files", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.checkPath("certs/server.pem", "read")).toThrow(SandboxError);
      });

      it("respects custom allow paths", () => {
        const allowedDir = path.join(tempDir, "allowed-dir");
        fs.mkdirSync(allowedDir);
        fs.writeFileSync(path.join(allowedDir, "test.txt"), "test");

        const sandbox = createSandbox({
          repoRoot,
          allowPaths: [repoRoot, allowedDir],
        });

        expect(() => sandbox.checkPath(path.join(allowedDir, "test.txt"), "read")).not.toThrow();
      });

      it("respects custom deny paths", () => {
        const sandbox = createSandbox({
          repoRoot,
          denyPaths: ["**/custom-deny/**"],
        });

        expect(() => sandbox.checkPath("custom-deny/file.txt", "read")).toThrow(SandboxError);
      });
    });

    describe("tool execution", () => {
      it("denies tool execution by default", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.checkTool("git")).toThrow(SandboxError);

        try {
          sandbox.checkTool("git");
        } catch (error) {
          const sandboxError = error as SandboxError;
          expect(sandboxError.violationType).toBe("tool");
          expect(sandboxError.details).toContain("no_tools_allowed");
        }
      });

      it("allows tool execution when in allowlist", () => {
        const sandbox = createSandbox({
          repoRoot,
          allowTools: ["git", "rg"],
        });

        expect(() => sandbox.checkTool("git")).not.toThrow();
        expect(() => sandbox.checkTool("rg")).not.toThrow();
      });

      it("denies tool not in allowlist", () => {
        const sandbox = createSandbox({
          repoRoot,
          allowTools: ["git"],
        });

        expect(() => sandbox.checkTool("curl")).toThrow(SandboxError);

        try {
          sandbox.checkTool("curl");
        } catch (error) {
          const sandboxError = error as SandboxError;
          expect(sandboxError.violationType).toBe("tool");
          expect(sandboxError.details).toContain("requested_tool: curl");
        }
      });
    });

    describe("network access", () => {
      it("denies network by default", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.checkNetwork()).toThrow(SandboxError);

        try {
          sandbox.checkNetwork();
        } catch (error) {
          const sandboxError = error as SandboxError;
          expect(sandboxError.violationType).toBe("network");
        }
      });

      it("allows network when enabled", () => {
        const sandbox = createSandbox({
          repoRoot,
          allowNetwork: true,
        });

        expect(() => sandbox.checkNetwork()).not.toThrow();
      });

      it("includes CI-specific message when in CI mode", () => {
        const sandbox = createSandbox({
          repoRoot,
          ci: true,
          allowNetwork: false,
        });

        try {
          sandbox.checkNetwork();
        } catch (error) {
          const sandboxError = error as SandboxError;
          expect(sandboxError.details).toContain("network_disabled_in_ci");
        }
      });
    });

    describe("file operations", () => {
      it("readFile works for allowed paths", () => {
        const sandbox = createSandbox({ repoRoot });

        const content = sandbox.readFile("allowed.txt");
        expect(content).toBe("allowed content");
      });

      it("readFile throws for denied paths", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.readFile(".git/config")).toThrow(SandboxError);
      });

      it("writeFile works for allowed paths", () => {
        const sandbox = createSandbox({ repoRoot });

        sandbox.writeFile("new-file.txt", "new content");

        const written = fs.readFileSync(path.join(repoRoot, "new-file.txt"), "utf-8");
        expect(written).toBe("new content");
      });

      it("writeFile creates parent directories", () => {
        const sandbox = createSandbox({ repoRoot });

        sandbox.writeFile("new-dir/nested/file.txt", "nested content");

        expect(fs.existsSync(path.join(repoRoot, "new-dir", "nested", "file.txt"))).toBe(true);
      });

      it("writeFile throws for denied paths", () => {
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.writeFile(".git/hooks/test", "malicious")).toThrow(SandboxError);
      });
    });

    describe("dotenv handling", () => {
      it("denies .env by default", () => {
        fs.writeFileSync(path.join(repoRoot, ".env"), "SECRET=value");
        const sandbox = createSandbox({ repoRoot });

        expect(() => sandbox.checkPath(".env", "read")).toThrow(SandboxError);
      });

      it("allows .env when allowDotenv is true", () => {
        fs.writeFileSync(path.join(repoRoot, ".env"), "SECRET=value");
        const sandbox = createSandbox({
          repoRoot,
          allowDotenv: true,
        });

        expect(() => sandbox.checkPath(".env", "read")).not.toThrow();
      });
    });

    describe("unsafe sensitive paths", () => {
      it("still denies hardcoded patterns by default", () => {
        const sandbox = createSandbox({ repoRoot });

        // All hardcoded patterns should be denied
        expect(() => sandbox.checkPath(".git/config", "read")).toThrow(SandboxError);
        expect(() => sandbox.checkPath("certs/server.pem", "read")).toThrow(SandboxError);
      });

      it("allows sensitive paths when unsafeAllowSensitivePaths is true", () => {
        // Create the file first
        fs.writeFileSync(path.join(repoRoot, "test.pem"), "cert");

        const sandbox = createSandbox({
          repoRoot,
          unsafeAllowSensitivePaths: true,
        });

        // .pem should now be allowed (but file must exist for readFile)
        expect(() => sandbox.checkPath("test.pem", "read")).not.toThrow();
      });
    });
  });

  describe("SandboxError", () => {
    it("formats error with stable-sorted details", () => {
      const error = new SandboxError("Test error", "path", ["detail_z", "detail_a", "detail_m"]);

      const formatted = error.format();

      expect(formatted).toContain("Sandbox Error (path): Test error");
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
      const error = new SandboxError("Test", "path", [], SANDBOX_EXIT_CODE);
      expect(error.exitCode).toBe(2);
    });
  });

  describe("detectRepoRoot", () => {
    it("finds .git directory", () => {
      const detected = detectRepoRoot(path.join(repoRoot, "src"));
      expect(detected).toBe(repoRoot);
    });

    it("finds package.json", () => {
      // Remove .git and add package.json
      fs.rmSync(path.join(repoRoot, ".git"), { recursive: true });
      fs.writeFileSync(path.join(repoRoot, "package.json"), "{}");

      const detected = detectRepoRoot(path.join(repoRoot, "src"));
      expect(detected).toBe(repoRoot);
    });

    it("falls back to start directory", () => {
      const emptyDir = path.join(tempDir, "empty");
      fs.mkdirSync(emptyDir);

      const detected = detectRepoRoot(emptyDir);
      expect(detected).toBe(emptyDir);
    });
  });

  describe("HARDCODED_DENY_PATTERNS", () => {
    it("includes critical security patterns", () => {
      expect(HARDCODED_DENY_PATTERNS).toContain(".git/**");
      expect(HARDCODED_DENY_PATTERNS).toContain("**/*.pem");
      expect(HARDCODED_DENY_PATTERNS).toContain("**/*.key");
      expect(HARDCODED_DENY_PATTERNS).toContain("**/secrets/**");
    });
  });
});
