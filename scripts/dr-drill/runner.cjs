#!/usr/bin/env node
const fs = require("fs");
const { spawnSync } = require("child_process");

const DEFAULT_ALLOWED_ENVS = ["dev", "development", "staging", "qa", "test"];
const PROD_ALLOW_VALUES = ["true", "1", true];

const defaultInvariantCommands = {
  tenancyIsolation: process.env.DR_DRILL_TENANCY_CMD,
  exportVerification: process.env.DR_DRILL_EXPORT_CMD,
  auditLedgerChain: process.env.DR_DRILL_LEDGER_CMD || "./scripts/verify-audit-chain.js",
};

function canExecute(command) {
  if (!command || !command.trim()) {
    return false;
  }
  const firstToken = command.trim().split(/\s+/)[0];
  if (firstToken.startsWith("./") || firstToken.startsWith("../") || firstToken.startsWith("/")) {
    return fs.existsSync(firstToken);
  }
  return true;
}

function runCommand(command, label) {
  if (!canExecute(command)) {
    return {
      status: "skipped",
      command,
      stdout: "",
      stderr: `${label} command not found or not configured`,
      code: null,
      durationMs: 0,
    };
  }

  const start = Date.now();
  const result = spawnSync(command, { shell: true, encoding: "utf8" });
  const durationMs = Date.now() - start;

  const status = result.status === 0 ? "passed" : "failed";
  return {
    status,
    command,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    code: result.status ?? result.signal,
    durationMs,
  };
}

function assertEnvironment(env, allowProdFlag, allowProdEnvValue) {
  const normalized = (env || "").toLowerCase();
  if (normalized === "prod" || normalized === "production") {
    const envGateEnabled = PROD_ALLOW_VALUES.includes(allowProdEnvValue);
    const flagGateEnabled = allowProdFlag === true;

    if (!(envGateEnabled && flagGateEnabled)) {
      throw new Error(
        "DR drill cannot run against production without --allow-prod and DR_DRILL_ALLOW_PROD=true"
      );
    }
    return "production";
  }
  if (!DEFAULT_ALLOWED_ENVS.includes(normalized)) {
    throw new Error(`Environment ${env} is not permitted for DR drill`);
  }
  return normalized;
}

function evaluateCorruption(result) {
  if (result.status === "failed") {
    return "corrupted";
  }
  const output = `${result.stdout} ${result.stderr}`.toLowerCase();
  if (output.includes("corrupt") || output.includes("checksum mismatch")) {
    return "corrupted";
  }
  return result.status;
}

function runInvariantChecks(commands, executor) {
  return Object.entries(commands).map(([name, command]) => {
    const label = name.replace(/([A-Z])/g, " $1").toLowerCase();
    const result = executor(command, `${label} invariant`);
    return {
      name,
      status: result.status,
      details: result.stderr || result.stdout,
      command,
      durationMs: result.durationMs,
    };
  });
}

function aggregateStatus(stages) {
  const severity = ["failed", "corrupted"];
  if (stages.some((stage) => severity.includes(stage.status))) {
    return "failed";
  }
  return stages.every((stage) => stage.status === "passed" || stage.status === "skipped")
    ? "passed"
    : "failed";
}

function runDrDrill(options = {}, executor = runCommand) {
  const config = {
    env: options.env || process.env.DR_DRILL_ENV || "dev",
    allowProdFlag:
      options.allowProd === true ||
      process.env.DR_DRILL_ALLOW_PROD_FLAG === "true" ||
      process.env.DR_DRILL_ALLOW_PROD_FLAG === "1",
    backupCommand:
      options.backupCommand || process.env.DR_DRILL_BACKUP_CMD || "./scripts/backup.sh",
    wipeCommand:
      options.wipeCommand ||
      process.env.DR_DRILL_WIPE_CMD ||
      "./scripts/backup-drill.sh --wipe-only",
    restoreCommand:
      options.restoreCommand || process.env.DR_DRILL_RESTORE_CMD || "./scripts/restore.sh",
    corruptionCheckCommand:
      options.corruptionCheckCommand ||
      process.env.DR_DRILL_CORRUPTION_CMD ||
      "./scripts/verify-audit-chain.js",
    invariants: {
      ...defaultInvariantCommands,
      ...(options.invariants || {}),
    },
  };

  const startTime = new Date();
  const normalizedEnv = assertEnvironment(
    config.env,
    config.allowProdFlag,
    process.env.DR_DRILL_ALLOW_PROD
  );

  const backup = executor(config.backupCommand, "backup");
  const wipe = executor(config.wipeCommand, "wipe");
  const restore = executor(config.restoreCommand, "restore");

  const invariantResults = runInvariantChecks(config.invariants, executor);

  const corruptionCheckRaw = executor(config.corruptionCheckCommand, "corruption check");
  const corruptionStatus = evaluateCorruption(corruptionCheckRaw);
  const corruptionCheck = { ...corruptionCheckRaw, status: corruptionStatus };

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const allStages = [backup, wipe, restore, ...invariantResults, corruptionCheck];
  const overallStatus = aggregateStatus(allStages);

  return {
    env: normalizedEnv,
    startedAt: startTime.toISOString(),
    completedAt: endTime.toISOString(),
    durationMs,
    stages: {
      backup,
      wipe,
      restore,
      corruptionCheck,
      invariants: invariantResults,
    },
    overallStatus,
  };
}

module.exports = {
  runDrDrill,
  runCommand,
  assertEnvironment,
  evaluateCorruption,
};
