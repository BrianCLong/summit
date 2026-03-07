import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";

async function copyTemplate(src: string, dest: string, replacements: Record<string, string>) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await fs.mkdir(dest, { recursive: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTemplate(srcPath, destPath, replacements);
    } else {
      const content = await fs.readFile(srcPath, "utf-8");
      const replaced = Object.entries(replacements).reduce(
        (acc, [key, value]) => acc.replaceAll(key, value),
        content
      );
      await fs.writeFile(destPath, replaced, "utf-8");
    }
  }
}

export async function scaffoldService(targetDir: string, serviceName: string) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const templateDir = path.join(here, "../template");
  await copyTemplate(templateDir, targetDir, {
    __SERVICE_NAME__: serviceName,
    __service_name__: serviceName,
  });
}
