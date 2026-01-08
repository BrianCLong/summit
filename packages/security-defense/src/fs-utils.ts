import fs from "fs";
import path from "path";
import fg from "fast-glob";

export const readJsonFile = <T = unknown>(filePath: string): T | null => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const findFiles = (root: string, patterns: string[]): string[] => {
  return fg.sync(patterns, {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    absolute: true,
  });
};

export const loadFile = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const findFirstExisting = (root: string, candidates: string[]): string | null => {
  for (const candidate of candidates) {
    const fullPath = path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
};
