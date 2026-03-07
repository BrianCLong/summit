// @ts-nocheck
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InitOptions } from "./types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const templatesRoot = path.resolve(currentDir, "../templates");

export async function initAdapterProject(options: InitOptions): Promise<string> {
  const source = path.join(templatesRoot, options.template);

  if (!(await fs.pathExists(source))) {
    throw new Error(`Template "${options.template}" was not found in ${templatesRoot}.`);
  }

  const target = path.isAbsolute(options.directory)
    ? options.directory
    : path.resolve(process.cwd(), options.directory);

  if (await fs.pathExists(target)) {
    if (!options.force) {
      throw new Error(
        `Target directory ${target} already exists. Re-run with --force to overwrite.`
      );
    }

    await fs.emptyDir(target);
  }

  await fs.ensureDir(target);
  await fs.copy(source, target, { overwrite: true, errorOnExist: !options.force });

  return target;
}
