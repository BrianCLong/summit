import { spawn, spawnSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const DEFAULT_POLICY_PATH = 'docs/ci/HERMETIC_CI_POLICY.yml';

const SENSITIVE_KEY_PATTERNS = [
  /^AWS_/i,
  /^GCP_/i,
  /^AZURE_/i,
  /^GITHUB_/i,
  /^GH_/i,
  /^NPM_TOKEN$/i,
  /^NODE_AUTH_TOKEN$/i,
  /TOKEN/i,
  /SECRET/i,
  /PASSWORD/i,
  /PASSWD/i,
  /PRIVATE_KEY/i,
  /API_KEY/i,
];

const EXIT_CODES = {
  PASS: 0,
  FAIL: 1,
  ERROR: 2,
};

const nowIso = () => new Date().toISOString();

const stableStringify = (value) => {
  const seen = new WeakSet();
  const replacer = (_key, val) => {
    if (val && typeof val === 'object') {
      if (seen.has(val)) {
        return undefined;
      }
      seen.add(val);
      if (Array.isArray(val)) {
        return val;
      }
      return Object.keys(val)
        .sort()
        .reduce((acc, key) => {
          acc[key] = val[key];
          return acc;
        }, {});
    }
    return val;
  };
  return JSON.stringify(value, replacer, 2) + '\n';
};

const sha256 = (input) =>
  crypto.createHash('sha256').update(input).digest('hex');

const parseArgs = (argv) => {
  const args = { steps: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--policy') {
      args.policy = argv[i + 1];
      i += 1;
    } else if (token === '--sha') {
      args.sha = argv[i + 1];
      i += 1;
    } else if (token === '--out') {
      args.out = argv[i + 1];
      i += 1;
    } else if (token === '--step') {
      args.steps.push(argv[i + 1]);
      i += 1;
    }
  }
  return args;
};

const sanitizeEnv = (env) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(env)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) =>
      pattern.test(key),
    );
    if (!isSensitive) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const commandExists = (command) => {
  const result = spawnSync('which', [command], { stdio: 'ignore' });
  return result.status === 0;
};

const runCommand = async ({
  command,
  shell,
  env,
  cwd,
  stdoutPath,
  stderrPath,
  maxLogBytes,
  stracePath,
}) => {
  const stdoutStream = fs.createWriteStream(stdoutPath);
  const stderrStream = fs.createWriteStream(stderrPath);
  let stdoutBytes = 0;
  let stderrBytes = 0;
  const stdoutTruncated = { value: false };
  const stderrTruncated = { value: false };

  const writeWithLimit = (stream, chunk, state, limit) => {
    if (state.value) {
      return;
    }
    if (chunk.length + stream.bytesWritten > limit) {
      const remaining = limit - stream.bytesWritten;
      if (remaining > 0) {
        stream.write(chunk.subarray(0, remaining));
      }
      state.value = true;
      return;
    }
    stream.write(chunk);
  };

  const spawnArgs = [];
  let spawnCommand = shell;

  if (stracePath) {
    spawnCommand = 'strace';
    spawnArgs.push(
      '-f',
      '-e',
      'trace=network',
      '-o',
      stracePath,
      '--',
      shell,
      '-lc',
      command,
    );
  } else {
    spawnArgs.push('-lc', command);
  }

  const child = spawn(spawnCommand, spawnArgs, {
    env,
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  child.stdout.on('data', (chunk) => {
    stdoutBytes += chunk.length;
    writeWithLimit(stdoutStream, chunk, stdoutTruncated, maxLogBytes);
  });

  child.stderr.on('data', (chunk) => {
    stderrBytes += chunk.length;
    writeWithLimit(stderrStream, chunk, stderrTruncated, maxLogBytes);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 1));
  });

  stdoutStream.end();
  stderrStream.end();

  return {
    exitCode,
    pid: child.pid,
    stdout: {
      bytes: stdoutBytes,
      truncated: stdoutTruncated.value,
    },
    stderr: {
      bytes: stderrBytes,
      truncated: stderrTruncated.value,
    },
  };
};

const readCommandOutput = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8' });
  } catch (error) {
    return '';
  }
};

const parsePs = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
      if (!match) {
        return null;
      }
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        pgid: Number(match[3]),
        command: match[4],
        args: match[5],
      };
    })
    .filter(Boolean);
};

const parseSsListeners = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines
    .map((line) => {
      if (!line.includes('LISTEN')) {
        return null;
      }
      const pidMatch = line.match(/pid=(\d+)/);
      if (!pidMatch) {
        return null;
      }
      const localMatch = line.match(/\s(\S+):(\d+)\s/);
      return {
        pid: Number(pidMatch[1]),
        port: localMatch ? Number(localMatch[2]) : null,
        process: line.match(/\(\"([^\"]+)\"/)?.[1] ?? 'unknown',
        raw: line,
      };
    })
    .filter(Boolean);
};

const parseSsEstablished = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines
    .map((line) => {
      if (!line.includes('ESTAB')) {
        return null;
      }
      const pidMatch = line.match(/pid=(\d+)/);
      if (!pidMatch) {
        return null;
      }
      const remoteMatch = line.match(/\s(\S+):(\d+)\s+users/);
      return {
        pid: Number(pidMatch[1]),
        remotePort: remoteMatch ? Number(remoteMatch[2]) : null,
        raw: line,
      };
    })
    .filter(Boolean);
};

const parseStraceNetwork = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines
    .map((line) => {
      if (!line.includes('connect(') && !line.includes('sendto(')) {
        return null;
      }
      const portMatch = line.match(/sin_port=htons\((\d+)\)/);
      const ipMatch = line.match(/inet_addr\(\"([^\"]+)\"\)/);
      const syscall = line.includes('connect(')
        ? 'connect'
        : line.includes('sendto(')
          ? 'sendto'
          : 'network';
      return {
        dst: ipMatch ? 'redacted' : 'unknown',
        dstRaw: ipMatch ? ipMatch[1] : null,
        port: portMatch ? Number(portMatch[1]) : null,
        syscall,
        raw: line,
      };
    })
    .filter(Boolean);
};

const evaluateOutboundViolations = (events, allow) => {
  const violations = [];
  for (const event of events) {
    const portAllowed =
      allow.outbound_ports && allow.outbound_ports.includes(event.port);
    const hostAllowed =
      allow.outbound_hosts &&
      (allow.outbound_hosts.includes('*') ||
        allow.outbound_hosts.includes(event.dst) ||
        (event.dstRaw && allow.outbound_hosts.includes(event.dstRaw)));
    if (!portAllowed && !hostAllowed) {
      violations.push({
        dst: event.dst,
        port: event.port,
        syscall: event.syscall,
      });
    }
  }
  return violations;
};

const evaluateListenViolations = (listeners, allow, pids) => {
  const violations = [];
  const pidSet = new Set(pids);
  for (const listener of listeners) {
    if (!pidSet.has(listener.pid)) {
      continue;
    }
    if (listener.port && allow.listen_ports?.includes(listener.port)) {
      continue;
    }
    violations.push({
      port: listener.port,
      process: listener.process,
      pid: listener.pid,
    });
  }
  return violations;
};

const loadPolicy = (policyPath) => {
  const raw = fs.readFileSync(policyPath, 'utf8');
  const data = yaml.load(raw);
  if (!data || data.schema_version !== '1') {
    throw new Error('Invalid policy schema_version');
  }
  if (!Array.isArray(data.hermetic_steps)) {
    throw new Error('Policy missing hermetic_steps');
  }
  return { raw, data };
};

const renderReportMd = (report) => {
  const lines = [];
  lines.push('# Hermetic CI Gate Report');
  lines.push('');
  lines.push(`SHA: ${report.sha}`);
  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push('');
  lines.push('## Steps');
  for (const step of report.steps) {
    lines.push(`### ${step.id}`);
    lines.push(`- Command: \`${step.command}\``);
    lines.push(`- Exit code: ${step.exit_code}`);
    lines.push(`- Verdict: ${step.verdict}`);
    lines.push(`- Outbound detection: ${step.detection.outbound_mode}`);
    lines.push(`- Listen detection: ${step.detection.listen_mode}`);
    if (step.violations.listen.length > 0) {
      lines.push('- Listen violations:');
      for (const violation of step.violations.listen) {
        lines.push(
          `  - pid ${violation.pid} (${violation.process}) listened on ${violation.port}`,
        );
      }
    }
    if (step.violations.outbound.length > 0) {
      lines.push('- Outbound violations:');
      for (const violation of step.violations.outbound) {
        lines.push(
          `  - ${violation.syscall} to ${violation.dst} on port ${violation.port}`,
        );
      }
    }
    if (
      step.violations.listen.length === 0 &&
      step.violations.outbound.length === 0
    ) {
      lines.push('- Violations: none');
    }
    lines.push('');
  }
  lines.push('## Remediation');
  lines.push(
    '- Remove outbound calls from hermetic steps or declare a Governed Exception in the policy allowlist.',
  );
  lines.push(
    '- Ensure tests do not bind sockets; use in-memory fakes or disable listeners under NO_NETWORK_LISTEN.',
  );
  lines.push(
    '- Re-run `pnpm ci:hermetic` to refresh evidence in artifacts/governance/hermetic-ci.',
  );
  lines.push('');
  lines.push('## Diagnostics');
  lines.push(
    '- See logs/ for stdout/stderr, socket snapshots, process tree, and strace traces when available.',
  );
  lines.push('');
  lines.push(
    'Detections are intentionally constrained to avoid capturing secrets or non-essential data.',
  );
  lines.push('');
  return lines.join('\n');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const policyPath = args.policy ?? DEFAULT_POLICY_PATH;

  let policy;
  let policyRaw;
  try {
    const loaded = loadPolicy(policyPath);
    policy = loaded.data;
    policyRaw = loaded.raw;
  } catch (error) {
    console.error(`Policy load error: ${error.message}`);
    process.exit(EXIT_CODES.ERROR);
  }

  let sha = args.sha;
  if (!sha) {
    try {
      sha = execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      console.error('Unable to resolve git SHA. Provide --sha.');
      process.exit(EXIT_CODES.ERROR);
    }
  }

  const outTemplate = args.out ?? policy.output?.out_dir;
  if (!outTemplate) {
    console.error('Missing output directory in policy or --out');
    process.exit(EXIT_CODES.ERROR);
  }
  const outDir = outTemplate.replace(/\$\{sha\}/g, sha);
  ensureDir(outDir);
  ensureDir(path.join(outDir, 'logs'));

  const maxLogBytes = Number(policy.diagnostics?.max_log_bytes ?? 200000);
  const defaultShell = policy.scope?.default_shell ?? 'bash';
  const straceAvailable = commandExists('strace');

  const stepsToRun = args.steps.length
    ? policy.hermetic_steps.filter((step) => args.steps.includes(step.id))
    : policy.hermetic_steps;

  if (stepsToRun.length === 0) {
    console.error('No matching hermetic steps to run.');
    process.exit(EXIT_CODES.ERROR);
  }

  const reportSteps = [];
  let overallStatus = 'pass';

  for (const step of stepsToRun.sort((a, b) => a.id.localeCompare(b.id))) {
    const stepLogDir = path.join(outDir, 'logs', step.id);
    ensureDir(stepLogDir);
    const stdoutPath = path.join(stepLogDir, 'stdout.txt');
    const stderrPath = path.join(stepLogDir, 'stderr.txt');
    const stracePath = path.join(stepLogDir, 'strace.txt');
    const ssListenPath = path.join(stepLogDir, 'ss_listen.txt');
    const ssEstablishedPath = path.join(stepLogDir, 'ss_established.txt');
    const processTreePath = path.join(stepLogDir, 'process_tree.json');

    const env = {
      ...sanitizeEnv(process.env),
      ...(step.env ?? {}),
    };

    const straceEnabled = straceAvailable;

    const commandResult = await runCommand({
      command: step.command,
      shell: defaultShell,
      env,
      cwd: process.cwd(),
      stdoutPath,
      stderrPath,
      maxLogBytes,
      stracePath: straceEnabled ? stracePath : null,
    });

    const psOutput = policy.diagnostics?.capture_process_tree
      ? readCommandOutput('ps', [
          '-eo',
          'pid,ppid,pgid,comm,args',
          '--no-headers',
        ])
      : '';

    const processes = parsePs(psOutput).filter(
      (proc) => proc.pgid === commandResult.pid,
    );

    if (policy.diagnostics?.capture_process_tree) {
      fs.writeFileSync(
        processTreePath,
        stableStringify(processes.sort((a, b) => a.pid - b.pid)),
      );
    }

    const pids = processes.map((proc) => proc.pid);

    let listenViolations = [];
    let listenMode = 'disabled';
    if (policy.diagnostics?.capture_open_sockets) {
      listenMode = 'ss';
      const listenOutput = readCommandOutput('ss', ['-ltnup']);
      fs.writeFileSync(ssListenPath, listenOutput);
      const listeners = parseSsListeners(listenOutput);
      listenViolations = evaluateListenViolations(
        listeners,
        step.allow ?? { listen_ports: [] },
        pids,
      );
    }

    let outboundViolations = [];
    let outboundMode = 'none';

    if (straceEnabled) {
      outboundMode = 'strace';
      const straceOutput = fs.readFileSync(stracePath, 'utf8');
      const events = parseStraceNetwork(straceOutput);
      outboundViolations = evaluateOutboundViolations(
        events,
        step.allow ?? { outbound_hosts: [], outbound_ports: [] },
      );
    } else {
      outboundMode = 'ss-fallback';
      const establishedOutput = readCommandOutput('ss', ['-tnp']);
      fs.writeFileSync(ssEstablishedPath, establishedOutput);
      const established = parseSsEstablished(establishedOutput).filter((entry) =>
        pids.includes(entry.pid),
      );
      if (established.length > 0) {
        outboundViolations = established.map((entry) => ({
          dst: 'redacted',
          port: entry.remotePort,
          syscall: 'established',
        }));
      }
    }

    const stepFailed =
      commandResult.exitCode !== 0 ||
      listenViolations.length > 0 ||
      outboundViolations.length > 0;

    if (stepFailed) {
      overallStatus = 'fail';
    }

    reportSteps.push({
      id: step.id,
      description: step.description ?? '',
      command: step.command,
      exit_code: commandResult.exitCode,
      verdict: stepFailed ? 'fail' : 'pass',
      detection: {
        outbound_mode: outboundMode,
        listen_mode: listenMode,
      },
      violations: {
        listen: listenViolations,
        outbound: outboundViolations,
      },
      logs: {
        stdout: path.relative(outDir, stdoutPath),
        stderr: path.relative(outDir, stderrPath),
        strace: straceEnabled ? path.relative(outDir, stracePath) : null,
        ss_listen: policy.diagnostics?.capture_open_sockets
          ? path.relative(outDir, ssListenPath)
          : null,
        ss_established: !straceEnabled
          ? path.relative(outDir, ssEstablishedPath)
          : null,
        process_tree: policy.diagnostics?.capture_process_tree
          ? path.relative(outDir, processTreePath)
          : null,
      },
    });
  }

  const report = {
    schema_version: '1',
    sha,
    status: overallStatus,
    steps: reportSteps.sort((a, b) => a.id.localeCompare(b.id)),
  };

  const reportJson = stableStringify(report);
  const reportPath = path.join(outDir, 'report.json');
  fs.writeFileSync(reportPath, reportJson);

  const reportMd = renderReportMd(report);
  fs.writeFileSync(path.join(outDir, 'report.md'), reportMd);

  const stamp = {
    status: overallStatus,
    sha,
    policy_hash: sha256(policyRaw),
    report_hash: sha256(reportJson),
    timestamp: nowIso(),
  };
  fs.writeFileSync(path.join(outDir, 'stamp.json'), stableStringify(stamp));

  process.exit(
    overallStatus === 'pass' ? EXIT_CODES.PASS : EXIT_CODES.FAIL,
  );
};

await main();
