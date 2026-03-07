export interface ConfirmationOptions {
  confirmed?: boolean;
  env?: NodeJS.ProcessEnv;
  logger?: { warn?: (message: string) => void };
  hint?: string;
}

export interface MassMutationOptions {
  overrideEnvVar?: string;
  env?: NodeJS.ProcessEnv;
  logger?: { warn?: (message: string) => void };
  reason?: string;
}

export function isSandboxMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.SANDBOX_MODE ?? "").toLowerCase() === "true";
}

export function requiresConfirmation(operation: string, options: ConfirmationOptions = {}): void {
  const env = options.env ?? process.env;
  const normalizedKey = operation
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const confirmed =
    options.confirmed ||
    env?.CONFIRM_ALL_WRITES === "true" ||
    env?.[`CONFIRM_${normalizedKey}`] === "true";

  if (confirmed) {
    return;
  }

  const hint = options.hint ? ` ${options.hint}` : "";
  const message = `Operation "${operation}" blocked: confirmation required.${hint}`;
  options.logger?.warn?.(message);
  throw new Error(message);
}

export function preventMassMutation(
  affected: number,
  threshold = 500,
  options: MassMutationOptions = {}
): void {
  const env = options.env ?? process.env;
  const overrideKey = options.overrideEnvVar ?? "ALLOW_MASS_MUTATION";

  if (affected <= threshold) {
    return;
  }

  if (env?.[overrideKey] === "true") {
    options.logger?.warn?.(
      `Mass mutation override enabled via ${overrideKey}; proceeding with ${affected} records (threshold ${threshold}).`
    );
    return;
  }

  const reason = options.reason ? ` Reason: ${options.reason}` : "";
  const message = `Refusing to mutate ${affected} records (threshold ${threshold}). Set ${overrideKey}=true to override.${reason}`;
  options.logger?.warn?.(message);
  throw new Error(message);
}
