import fs from 'node:fs';
import path from 'node:path';

export type FuzzTarget = {
  name: string;
  handler: (input: string) => Promise<void> | void;
  seeds: string[];
  iterations?: number;
  timeoutMs?: number;
};

export type FuzzResult = {
  name: string;
  iterations: number;
  failures: Array<{
    iteration: number;
    error: string;
    artifactPath: string;
    seed: number;
  }>;
};

type RNG = () => number;

const DEFAULT_ARTIFACT_ROOT = path.join(process.cwd(), 'artifacts', 'fuzz');
const DEFAULT_TIMEOUT_MS = 50;

export type FuzzRunOptions = {
  artifactRoot?: string;
  maxDurationMs?: number;
  logSeed?: boolean;
};

function mulberry32(seed: number): RNG {
  return function rng() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mutateSeed(seed: string, rng: RNG): string {
  const buffer = Buffer.from(seed);
  if (buffer.length === 0) {
    return seed;
  }

  const operations = [
    () => {
      const idx = Math.floor(rng() * buffer.length);
      buffer[idx] = (buffer[idx] + Math.floor(rng() * 32)) % 256;
    },
    () => {
      const idx = Math.floor(rng() * buffer.length);
      buffer[idx] = 0;
    },
    () => {
      buffer.reverse();
    },
    () => {
      const idx = Math.floor(rng() * buffer.length);
      const len = Math.max(1, Math.floor(rng() * 4));
      const slice = buffer.subarray(idx, Math.min(buffer.length, idx + len));
      return Buffer.concat([buffer.subarray(0, idx), slice, buffer.subarray(idx)]);
    },
  ];

  const op = operations[Math.floor(rng() * operations.length)];
  const mutated = op() ?? buffer;
  return (mutated instanceof Buffer ? mutated : buffer).toString();
}

function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  let handle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    handle = setTimeout(() => reject(new Error(`Timeout after ${ms}ms in ${name}`)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(handle!));
}

function ensureArtifactDir(artifactRoot: string) {
  fs.mkdirSync(artifactRoot, { recursive: true });
}

function persistArtifact(
  target: string,
  iteration: number,
  seed: number,
  input: string,
  artifactRoot: string,
): string {
  ensureArtifactDir(artifactRoot);
  const filePath = path.join(
    artifactRoot,
    `${target}-seed-${seed}-iteration-${iteration}.txt`,
  );
  fs.writeFileSync(filePath, input, 'utf8');
  return filePath;
}

export async function runFuzzTargets(
  targets: FuzzTarget[],
  seed = 1337,
  options: FuzzRunOptions = {},
): Promise<FuzzResult[]> {
  const rng = mulberry32(seed);
  const artifactRoot = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT;
  const startedAt = Date.now();
  const results: FuzzResult[] = [];

  for (const target of targets) {
    const iterations = target.iterations ?? 50;
    const timeoutMs = target.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const failures: FuzzResult['failures'] = [];

    for (let i = 0; i < iterations; i += 1) {
      if (options.maxDurationMs && Date.now() - startedAt > options.maxDurationMs) {
        failures.push({
          iteration: i,
          error: `Aborted after exceeding ${options.maxDurationMs}ms budget`,
          artifactPath: persistArtifact(target.name, i, seed, 'timed-out', artifactRoot),
          seed,
        });
        break;
      }

      const seedIndex = Math.floor(rng() * target.seeds.length);
      const mutated = mutateSeed(target.seeds[seedIndex], rng);

      try {
        await withTimeout(Promise.resolve(target.handler(mutated)), timeoutMs, target.name);
      } catch (error) {
        const artifactPath = persistArtifact(target.name, i, seed, mutated, artifactRoot);
        failures.push({
          iteration: i,
          error: error instanceof Error ? error.message : String(error),
          artifactPath,
          seed,
        });
      }
    }

    results.push({ name: target.name, iterations, failures });
  }

  if (options.logSeed !== false && results.some((result) => result.failures.length > 0)) {
    console.error(`Fuzz failures detected with seed=${seed}`);
  }

  return results;
}

export function summarize(results: FuzzResult[]): string {
  return results
    .map((result) => {
      const summary = `${result.name}: ${result.iterations} iterations, ${result.failures.length} failures`;
      if (result.failures.length === 0) {
        return summary;
      }
      const detail = result.failures
        .map((failure) => `  - #${failure.iteration}: ${failure.error} (artifact: ${failure.artifactPath})`)
        .join('\n');
      return `${summary}\n${detail}`;
    })
    .join('\n');
}
