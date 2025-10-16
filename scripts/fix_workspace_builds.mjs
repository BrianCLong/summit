#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";

const roots = ["apps", "packages", "services", "contracts"];
const repo = process.cwd();

async function exists(p){ try { await fs.access(p); return true; } catch { return false; } }

for (const root of roots) {
  const dir = path.join(repo, root);
  if (!(await exists(dir))) continue;
  for (const entry of await fs.readdir(dir)) {
    const pkgDir = path.join(dir, entry);
    const pj = path.join(pkgDir, "package.json");
    if (!(await exists(pj))) continue;

    const data = JSON.parse(await fs.readFile(pj, "utf8"));
    data.type ??= "module";
    data.scripts ??= {};
    // ensure a build script exists (no-op if JS only)
    if (!data.scripts.build) data.scripts.build = "echo skip";

    const srcDir = path.join(pkgDir, "src");
    const hasTs = await exists(srcDir) && (await fs.readdir(srcDir)).some(f => f.endsWith(".ts") || f.endsWith(".tsx"));
    const tsconfig = path.join(pkgDir, "tsconfig.json");

    if (hasTs) {
      data.main ??= "dist/index.js";
      data.types ??= "dist/index.d.ts";
      if (data.scripts.build === "echo skip") data.scripts.build = "tsc -b";
      const ts = {
        extends: path.relative(pkgDir, path.join(repo, "tsconfig.json")),
        compilerOptions: { composite: true, outDir: "./dist", rootDir: "./src" },
        include: ["src"],
        references: []
      };
      await fs.writeFile(tsconfig, JSON.stringify(ts, null, 2) + "\n");
    }
    await fs.writeFile(pj, JSON.stringify(data, null, 2) + "\n");
  }
}
console.log("✓ Workspace scripts normalized");
