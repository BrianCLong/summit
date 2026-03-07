import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { load } from "js-yaml";
import { stableStringify } from "./json_stable";

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function readYaml<T>(path: string): T {
  return load(readFileSync(path, "utf8")) as T;
}

export function readConfig<T>(path: string): T {
  if (path.endsWith(".yml") || path.endsWith(".yaml")) {
    return readYaml<T>(path);
  }
  return readJson<T>(path);
}

export function writeJsonDeterministic(path: string, obj: unknown) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, `${stableStringify(obj)}\n`, "utf8");
}

export function writeStampJson(path: string) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  // timestamps allowed ONLY here
  writeFileSync(path, JSON.stringify({ ts_utc: new Date().toISOString() }) + "\n", "utf8");
}
