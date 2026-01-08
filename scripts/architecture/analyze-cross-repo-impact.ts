import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import yaml from "js-yaml";

interface Dependency {
  target_repo: string;
  dependency_type: string;
  versioning_strategy: string;
}

interface RepoEntry {
  repo_name: string;
  role?: string;
  description?: string;
  dependencies?: Dependency[];
}

interface PublicInterface {
  name: string;
  path: string;
  type: string;
  description?: string;
  versioning?: string;
  owners?: string[];
  lastValidated?: string;
}

interface ExportedInterfacesFile {
  repo: string;
  publicInterfaces: PublicInterface[];
}

interface Impact {
  repo: string;
  dependencyType: string;
  versioningStrategy: string;
  risk: "low" | "medium" | "high";
  notes: string[];
}

const currentRepoName = process.env.CROSS_REPO_THIS_REPO ?? "intelgraph-platform";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.join(__dirname, "..", ".."));

function loadCrossRepoMap(): RepoEntry[] {
  const mapPath = path.join(repoRoot, "governance", "cross-repo-map.yml");
  if (!fs.existsSync(mapPath)) {
    throw new Error("Missing governance/cross-repo-map.yml");
  }

  const file = fs.readFileSync(mapPath, "utf8");
  const parsed = yaml.load(file);
  if (!Array.isArray(parsed)) {
    throw new Error("cross-repo-map.yml must be a YAML list");
  }
  return parsed as RepoEntry[];
}

function loadExportedInterfaces(): PublicInterface[] {
  const manifestPath = path.join(repoRoot, "governance", "exported-interfaces.json");
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  const parsed: ExportedInterfacesFile = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return parsed.publicInterfaces ?? [];
}

function runGit(command: string): string {
  try {
    return execSync(`git ${command}`, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch (error) {
    return "";
  }
}

function getChangedFiles(baseRef?: string): string[] {
  const base = baseRef ?? "origin/main";
  const diffCommands = [`diff --name-only ${base}...HEAD`, "diff --name-only"];

  for (const cmd of diffCommands) {
    const result = runGit(cmd);
    if (result) {
      return result.split("\n").filter(Boolean);
    }
  }

  return [];
}

function inferSurfaceType(filePath: string): string {
  if (
    filePath.includes("graphql") ||
    filePath.includes("openapi") ||
    filePath.includes("services/api")
  ) {
    return "API";
  }

  if (filePath.includes("schema") || filePath.includes("contract") || filePath.includes("policy")) {
    return "schema";
  }

  if (filePath.includes("packages/") || filePath.includes("lib/") || filePath.includes("sdk/")) {
    return "library";
  }

  return "docs";
}

function isPotentiallyBreaking(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.includes("schema") || lower.includes("openapi") || lower.includes("graphql");
}

function findMatchingInterfaces(
  changedFiles: string[],
  interfaces: PublicInterface[]
): PublicInterface[] {
  return interfaces.filter((entry) =>
    changedFiles.some((file) => file.startsWith(entry.path) || file === entry.path)
  );
}

function analyzeImpacts(
  changedFiles: string[],
  map: RepoEntry[],
  interfaces: PublicInterface[]
): Impact[] {
  const impacted: Impact[] = [];
  const matchingInterfaces = findMatchingInterfaces(changedFiles, interfaces);
  const inferredTypes = new Set(
    changedFiles.map(inferSurfaceType).map((type) => type.toLowerCase())
  );

  const dependents = map.filter((entry) =>
    entry.dependencies?.some((dep) => dep.target_repo === currentRepoName)
  );

  for (const dependent of dependents) {
    const relevantDeps =
      dependent.dependencies?.filter((dep) => dep.target_repo === currentRepoName) ?? [];
    for (const dep of relevantDeps) {
      const affectedSurfaces = matchingInterfaces.filter(
        (iface) => iface.type.toLowerCase() === dep.dependency_type.toLowerCase()
      );

      const inferredMatch = inferredTypes.has(dep.dependency_type.toLowerCase());

      const surfaceHint = affectedSurfaces.map((iface) => iface.name).join(", ");
      const risk: Impact["risk"] =
        affectedSurfaces.length > 0 || inferredMatch || dep.dependency_type === "API"
          ? "high"
          : "medium";

      const notes: string[] = [];
      if (affectedSurfaces.length === 0) {
        notes.push("No declared public interface touched; treat as advisory.");
      }

      if (inferredMatch && affectedSurfaces.length === 0) {
        notes.push(`Heuristic match: files suggest ${dep.dependency_type} surface changed.`);
      }

      const breakingHints = changedFiles.filter(isPotentiallyBreaking);
      if (breakingHints.length > 0 && dep.dependency_type !== "library") {
        notes.push(`Potential breaking change detected in ${breakingHints.join(", ")}`);
      }

      if (surfaceHint) {
        notes.push(`Interfaces impacted: ${surfaceHint}`);
      }

      notes.push(
        `Suggested action: bump according to ${dep.versioning_strategy} in ${dependent.repo_name}.`
      );

      impacted.push({
        repo: dependent.repo_name,
        dependencyType: dep.dependency_type,
        versioningStrategy: dep.versioning_strategy,
        risk,
        notes,
      });
    }
  }

  return impacted;
}

function formatOutput(changedFiles: string[], impacts: Impact[], baseRef?: string): string {
  const lines: string[] = [];
  lines.push("Cross-repo impact analysis");
  lines.push(`Base ref: ${baseRef ?? "origin/main"}`);
  lines.push("");
  lines.push("Changed files:");
  lines.push(
    changedFiles.length > 0 ? changedFiles.map((f) => `- ${f}`).join("\n") : "- None detected"
  );
  lines.push("");

  if (impacts.length === 0) {
    lines.push("No dependent repos flagged from cross-repo map.");
    return lines.join("\n");
  }

  lines.push("Impacted repos:");
  for (const impact of impacts) {
    lines.push(`- ${impact.repo} (type: ${impact.dependencyType}, risk: ${impact.risk})`);
    for (const note of impact.notes) {
      lines.push(`  - ${note}`);
    }
  }

  return lines.join("\n");
}

function main() {
  const baseArg = process.argv.find((arg) => arg.startsWith("--base-ref="));
  const baseRef = baseArg ? baseArg.split("=")[1] : undefined;

  const map = loadCrossRepoMap();
  const interfaces = loadExportedInterfaces();
  const changedFiles = getChangedFiles(baseRef);

  const impacts = analyzeImpacts(changedFiles, map, interfaces);
  const output = formatOutput(changedFiles, impacts, baseRef);

  console.log(output);
}

main();
