import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const websiteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(websiteRoot, "..");
const outputDir = path.join(websiteRoot, "static", "generated");
const outputFile = path.join(outputDir, "ga-docs.json");

const IGNORE_DIRS = new Set(["node_modules", ".git", ".turbo", ".next", "dist", "build", "coverage", "tmp", "tmp-test"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".rs", ".py", ".go"]);
const SCHEMA_EXTENSIONS = new Set([".yaml", ".yml", ".json", ".graphql", ".gql"]);
const RUNBOOK_EXTENSIONS = new Set([".md", ".mdx"]);

const LIMITS = {
  codeCommentDocs: 80,
  schemas: 60,
  runbooks: 40,
};

const SOURCE_DIRECTORIES = {
  codeCommentDocs: [path.join(repoRoot, "src"), path.join(repoRoot, "server", "src")],
  schemas: [path.join(repoRoot, "schemas"), path.join(repoRoot, "schema")],
  runbooks: [path.join(repoRoot, "RUNBOOKS"), path.join(repoRoot, "runbooks")],
};

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root, includeFile, limit) {
  const files = [];
  if (!(await pathExists(root))) return files;

  async function walk(current) {
    if (files.length >= limit) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(resolved);
      } else if (includeFile(resolved)) {
        files.push(resolved);
        if (files.length >= limit) return;
      }
    }
  }

  await walk(root);
  return files;
}

function summarize(text, length = 360) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length);
}

function extractDocblocks(content) {
  const blockMatches = [...content.matchAll(/\/\*\*([\s\S]*?)\*\//g)].map((match) => match[1].trim());
  const tripleSlash = [...content.matchAll(/\/\/\/(.*)/g)].map((match) => match[1].trim());
  const hashDoc = [...content.matchAll(/#\s?(.*)/g)]
    .map((match) => match[1].trim())
    .filter((line) => line.length > 0)
    .slice(0, 5);
  const combined = [...blockMatches, ...tripleSlash, ...hashDoc].filter(Boolean);
  if (combined.length === 0) {
    return summarize(content, 200);
  }
  return combined.slice(0, 4).join("\n\n");
}

function extractRunbook(content) {
  const title = content.match(/^#\s+(.+)/m)?.[1] ?? "Runbook";
  const body = content.replace(/^#\s+(.+)/m, "").trim();
  return { title, snippet: summarize(body, 420) };
}

function extractSchema(content) {
  const lines = content.split("\n").slice(0, 18).join("\n");
  return summarize(lines, 420);
}

function toRelative(filePath) {
  return path.relative(repoRoot, filePath);
}

async function buildBundle() {
  const bundle = {
    generatedAt: new Date().toISOString(),
    codeCommentDocs: [],
    schemas: [],
    runbooks: [],
  };

  if (!(await pathExists(outputDir))) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  for (const file of await collectCategory("codeCommentDocs", CODE_EXTENSIONS, extractDocblocks)) {
    bundle.codeCommentDocs.push(file);
  }

  for (const file of await collectCategory("schemas", SCHEMA_EXTENSIONS, extractSchema)) {
    bundle.schemas.push(file);
  }

  for (const file of await collectCategory("runbooks", RUNBOOK_EXTENSIONS, (text) => extractRunbook(text).snippet)) {
    bundle.runbooks.push(file);
  }

  await fs.writeFile(outputFile, JSON.stringify(bundle, null, 2));
  console.log(`Generated ${outputFile}`);
}

async function collectCategory(category, extensionSet, extractor) {
  const limit = LIMITS[category];
  const roots = SOURCE_DIRECTORIES[category];
  const results = [];

  for (const root of roots) {
    const files = await collectFiles(
      root,
      (file) => extensionSet.has(path.extname(file).toLowerCase()),
      limit - results.length,
    );

    for (const file of files) {
      const content = await fs.readFile(file, "utf8");
      const snippet = extractor(content);
      const title = path.basename(file);
      results.push({
        file: toRelative(file),
        title,
        summary: summarize(snippet),
        snippet: snippet.slice(0, 800),
        kind: category,
      });
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }

  return results;
}

buildBundle().catch((error) => {
  console.error("Failed to generate GA documentation bundle", error);
  process.exit(1);
});
