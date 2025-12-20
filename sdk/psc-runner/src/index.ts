import { spawnSync } from 'node:child_process';

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

function resolveBin(options?: RunnerOptions): string {
  return options?.binPath ?? process.env.PSC_RUNNER_BIN ?? 'psc-runner';
}

function invokeRunner(args: string[], options?: RunnerOptions): string {
  const bin = resolveBin(options);
  const result = spawnSync(bin, args, {
    encoding: 'utf8',
    env: options?.env,
  });
  if (result.error) {
    throw new Error(`failed to run ${bin}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? 'unknown error';
    throw new Error(`psc-runner exited with code ${result.status}: ${stderr}`);
  }
  return (result.stdout ?? '').trim();
}

export function compilePolicy(
  policyPath: string,
  outputPath: string,
  options: CompileOptions,
): string {
  const args = [
    'compile',
    '--policy',
    policyPath,
    '--secret-hex',
    options.secretHex,
    '--out',
    outputPath,
    '--key-id',
    options.keyId ?? 'demo-key',
  ];
  return invokeRunner(args, options);
}

export function runAnalytic(
  policyPath: string,
  inputPath: string,
  options: RunOptions,
): string {
  const args = [
    'run',
    '--policy',
    policyPath,
    '--input',
    inputPath,
    '--sealed-out',
    options.sealedOut,
    '--proof-out',
    options.proofOut,
  ];
  return invokeRunner(args, options);
}

export function verifyAttestation(
  policyPath: string,
  sealedPath: string,
  proofPath: string,
  options?: VerifyOptions,
): string {
  const args = [
    'verify',
    '--policy',
    policyPath,
    '--sealed',
    sealedPath,
    '--proof',
    proofPath,
  ];
  return invokeRunner(args, options);
}
