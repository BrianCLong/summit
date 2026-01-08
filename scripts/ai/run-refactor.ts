#!/usr/bin/env ts-node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import yaml from "js-yaml";

interface RefactorTarget {
  id: string;
  paths: string[];
  goal: string;
  constraints?: string[];
  checks?: string[];
}

interface RunOptions {
  dryRun: boolean;
  targetFilter?: string;
}

interface RefactorPrompt {
  target: RefactorTarget;
  files: { path: string; content: string }[];
  styleGuidance: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const targetsPath = path.join(repoRoot, "ai-refactor", "targets.yml");

const STYLE_RULES = [
  "Follow repository defaults: 2-space indent, Prettier formatting, and ESLint rules.",
  "Preserve public APIs; limit changes to internal implementation details.",
  "Keep security-sensitive flows untouched unless explicitly approved.",
  "Prefer small, reviewable diffs over sweeping rewrites.",
].join(" ");

const readTargets = async (): Promise<RefactorTarget[]> => {
  const raw = await fs.readFile(targetsPath, "utf8");
  const doc = yaml.load(raw);
  if (!Array.isArray(doc)) {
    throw new Error("targets.yml must be an array of target definitions");
  }
  return doc.map((entry) => ({
    id: String((entry as RefactorTarget).id),
    paths: (entry as RefactorTarget).paths ?? [],
    goal: (entry as RefactorTarget).goal,
    constraints: (entry as RefactorTarget).constraints ?? [],
    checks: (entry as RefactorTarget).checks ?? [],
  }));
};

const readFilesForTarget = async (target: RefactorTarget) => {
  const files = await Promise.all(
    target.paths.map(async (relativePath) => {
      const absolute = path.join(repoRoot, relativePath);
      const content = await fs.readFile(absolute, "utf8");
      return { path: relativePath, content };
    })
  );
  return files;
};

const buildPrompt = async (target: RefactorTarget): Promise<RefactorPrompt> => {
  const files = await readFilesForTarget(target);
  return {
    target,
    files,
    styleGuidance: STYLE_RULES,
  };
};

const requestLlm = async (prompt: string): Promise<string> => {
  const endpoint = process.env.LLM_LIGHT_BASE_URL || process.env.LLM_API_URL;
  const apiKey = process.env.LLM_LIGHT_API_KEY || process.env.LLM_API_KEY;

  if (!endpoint || !apiKey) {
    return [
      "LLM endpoint not configured. Recorded prompt for manual review.",
      "--- Prompt Below ---",
      prompt,
    ].join("\n\n");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { output?: string; content?: string; result?: string };
  return data.output ?? data.content ?? data.result ?? "";
};

const formatPromptText = (prompt: RefactorPrompt): string => {
  const constraintText =
    (prompt.target.constraints ?? []).map((c) => `- ${c}`).join("\n") || "- None specified";
  const fileSections = prompt.files
    .map((file) => `### File: ${file.path}\n\n\`\`\`\n${file.content}\n\`\`\``)
    .join("\n\n");

  return [
    `You are assisting with a scoped refactor (id: ${prompt.target.id}).`,
    `Goal: ${prompt.target.goal}.`,
    "Constraints:",
    constraintText,
    `Style rules: ${prompt.styleGuidance}`,
    "Return the fully rewritten file contents for each target file, formatted as a unified diff in markdown fences.",
    fileSections,
  ].join("\n\n");
};

const writeProposedChanges = async (target: RefactorTarget, proposal: string) => {
  const outputDir = path.join(repoRoot, "ai-refactor", "output");
  await fs.mkdir(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `${target.id}-proposal.md`);
  await fs.writeFile(outputFile, proposal, "utf8");
};

const applyProposalToFiles = async (proposal: string, target: RefactorTarget) => {
  if (!proposal.includes("@@")) {
    // Not a diff; leave output for manual application
    return;
  }

  // Simple best-effort patch application using `patch` command
  const patchProcess = spawn("patch", ["-p0"], {
    cwd: repoRoot,
    stdio: ["pipe", "inherit", "inherit"],
  });

  patchProcess.stdin.write(proposal);
  patchProcess.stdin.end();

  await new Promise<void>((resolve, reject) => {
    patchProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`patch exited with code ${code ?? -1}`));
      }
    });
  });

  console.log(`Applied proposed diff for target ${target.id}`);
};

const runChecks = async (target: RefactorTarget) => {
  for (const check of target.checks ?? []) {
    await new Promise<void>((resolve) => {
      const [cmd, ...args] = check.split(" ");
      const child = spawn(cmd, args, { cwd: repoRoot, stdio: "inherit", shell: true });
      child.on("close", (code) => {
        if (code !== 0) {
          console.warn(`Check failed (${check}); please review.`);
        }
        resolve();
      });
    });
  }
};

const summarizeDiff = async () => {
  const summary = spawn("git", ["diff", "--stat"], { cwd: repoRoot, stdio: "pipe" });
  const chunks: Buffer[] = [];
  summary.stdout?.on("data", (data) => chunks.push(Buffer.from(data)));
  return new Promise<string>((resolve, reject) => {
    summary.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("Unable to summarize diff"));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
};

const run = async () => {
  const args = process.argv.slice(2);
  const options: RunOptions = { dryRun: args.includes("--dry-run") };
  const targetFlag = args.find((arg) => arg.startsWith("--target="));
  if (targetFlag) {
    options.targetFilter = targetFlag.split("=")[1];
  }

  const targets = await readTargets();
  const activeTargets = options.targetFilter
    ? targets.filter((target) => target.id === options.targetFilter)
    : targets;

  if (!activeTargets.length) {
    console.warn("No targets matched the filter; exiting.");
    return;
  }

  for (const target of activeTargets) {
    console.log(`\n=== Running refactor for ${target.id} ===`);
    const prompt = await buildPrompt(target);
    const promptText = formatPromptText(prompt);

    if (options.dryRun) {
      await writeProposedChanges(target, promptText);
      console.log(`Dry run complete for ${target.id}; prompt recorded.`);
      continue;
    }

    const proposal = await requestLlm(promptText);
    await writeProposedChanges(target, proposal);
    try {
      await applyProposalToFiles(proposal, target);
    } catch (error) {
      console.warn(`Could not auto-apply proposal for ${target.id}: ${(error as Error).message}`);
    }

    await runChecks(target);
  }

  const diffSummary = await summarizeDiff();
  console.log("\n=== Diff Summary ===");
  console.log(diffSummary);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
