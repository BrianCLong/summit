import fs from 'node:fs';
import path from 'node:path';

export type FuzzTarget = {
  name: string;
  handler: (input: string) => Promise<void> | void;
  seeds: string[];
  iterations?: number;
  timeoutMs?: number;
};

export type FuzzFailure = {
  iteration: number;
  error: string;
  artifactPath: string;
  inputSample: string;
  seed: number;
};

export type FuzzResult = {
  name: string;
  iterations: number;
  seed: number;
  failures: FuzzFailure[];
};

type RNG = () => number;

const ARTIFACT_ROOT = path.join(process.cwd(), 'artifacts', 'fuzz');

function mulberry32(seed: number): RNG {
  return function rng() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function mutateSeed(seed: string, rng: RNG): string {
  const operations: Array<(value: string) => string> = [
    (value) => value,
    (value) => value.trim(),
    (value) => value.replace(/\s+/g, ' '),
    (value) => value.split(/\r?\n/).reverse().join('\n'),
    (value) => `${value}\n`,
  ];

  const op = operations[Math.floor(rng() * operations.length)];
  return op(seed);
}

function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  let handle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    handle = setTimeout(() => reject(new Error(`Timeout after ${ms}ms in ${name}`)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(handle!));
}

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_ROOT, { recursive: true });
}

function persistArtifact(
  target: string,
  iteration: number,
  seed: number,
  failureIndex: number,
  input: string,
): string {
  ensureArtifactDir();
  const fileName = `${target}-seed-${seed}-iter-${iteration}-fail-${failureIndex}.txt`;
  const filePath = path.join(ARTIFACT_ROOT, fileName);
  fs.writeFileSync(filePath, input, 'utf8');
  return filePath;
}

function toSample(input: string): string {
  return input.length > 512 ? `${input.slice(0, 512)}…` : input;
}

export async function runFuzzTargets(targets: FuzzTarget[], seed = 1337): Promise<FuzzResult[]> {
  const rng = mulberry32(seed);
  const results: FuzzResult[] = [];

  for (const target of targets) {
    const iterations = target.iterations ?? 50;
    const timeoutMs = target.timeoutMs ?? 50;
    const failures: FuzzResult['failures'] = [];

    for (let i = 0; i < iterations; i += 1) {
      const seedIndex = Math.floor(rng() * target.seeds.length);
      const mutated = mutateSeed(target.seeds[seedIndex], rng);

      try {
        await withTimeout(Promise.resolve(target.handler(mutated)), timeoutMs, target.name);
      } catch (error) {
        const artifactPath = persistArtifact(
          target.name,
          i,
          seed,
          failures.length,
          mutated,
        );
        failures.push({
          iteration: i,
          error: error instanceof Error ? error.message : String(error),
          artifactPath,
          inputSample: toSample(mutated),
          seed,
        });
      }
    }

    results.push({ name: target.name, iterations, seed, failures });
  }

  return results;
}

export function summarize(results: FuzzResult[]): string {
  return results
    .map((result) => {
      const summary = `${result.name} (seed ${result.seed}): ${result.iterations} iterations, ${result.failures.length} failures`;
      if (result.failures.length === 0) {
        return summary;
      }
      const detail = result.failures
        .map(
          (failure) =>
            `  - #${failure.iteration}: ${failure.error} (artifact: ${failure.artifactPath})`,
        )
        .join('\n');
      return `${summary}\n${detail}`;
    })
    .join('\n');
}
