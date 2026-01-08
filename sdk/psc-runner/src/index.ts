import { spawnSync } from "node:child_process";

export interface RunnerOptions {
  readonly binPath?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export interface CompileOptions extends RunnerOptions {
  readonly keyId?: string;
  readonly secretHex: string;
}

export interface RunOptions extends RunnerOptions {
  readonly sealedOut: string;
  readonly proofOut: string;
}

export interface VerifyOptions extends RunnerOptions {}

export type GraphAlgorithm = "shortest-path" | "page-rank" | "connected-components";

export interface GraphOptions extends RunnerOptions {
  readonly graphPath: string;
  readonly outPath: string;
  readonly algorithm: GraphAlgorithm;
  readonly start?: string;
  readonly end?: string;
  readonly damping?: number;
  readonly tolerance?: number;
  readonly iterations?: number;
}

function resolveBin(options?: RunnerOptions): string {
  return options?.binPath ?? process.env.PSC_RUNNER_BIN ?? "psc-runner";
}

function invokeRunner(args: string[], options?: RunnerOptions): string {
  const bin = resolveBin(options);
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    env: options?.env,
  });
  if (result.error) {
    throw new Error(`failed to run ${bin}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? "unknown error";
    throw new Error(`psc-runner exited with code ${result.status}: ${stderr}`);
  }
  return (result.stdout ?? "").trim();
}

export function compilePolicy(
  policyPath: string,
  outputPath: string,
  options: CompileOptions
): string {
  const args = [
    "compile",
    "--policy",
    policyPath,
    "--secret-hex",
    options.secretHex,
    "--out",
    outputPath,
    "--key-id",
    options.keyId ?? "demo-key",
  ];
  return invokeRunner(args, options);
}

export function runAnalytic(policyPath: string, inputPath: string, options: RunOptions): string {
  const args = [
    "run",
    "--policy",
    policyPath,
    "--input",
    inputPath,
    "--sealed-out",
    options.sealedOut,
    "--proof-out",
    options.proofOut,
  ];
  return invokeRunner(args, options);
}

export function verifyAttestation(
  policyPath: string,
  sealedPath: string,
  proofPath: string,
  options?: VerifyOptions
): string {
  const args = ["verify", "--policy", policyPath, "--sealed", sealedPath, "--proof", proofPath];
  return invokeRunner(args, options);
}

export function analyzeGraph(options: GraphOptions): string {
  const args = [
    "graph",
    "--graph",
    options.graphPath,
    "--out",
    options.outPath,
    "--algorithm",
    options.algorithm,
  ];

  if (options.algorithm === "shortest-path") {
    if (!options.start || !options.end) {
      throw new Error("start and end are required for shortest-path");
    }
    args.push("--start", options.start, "--end", options.end);
  }

  if (options.algorithm === "page-rank") {
    if (typeof options.damping === "number") {
      args.push("--damping", options.damping.toString());
    }
    if (typeof options.tolerance === "number") {
      args.push("--tolerance", options.tolerance.toString());
    }
    if (typeof options.iterations === "number") {
      args.push("--iterations", options.iterations.toString());
    }
  }

  return invokeRunner(args, options);
}
