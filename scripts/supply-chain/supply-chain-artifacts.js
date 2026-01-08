const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const DEFAULT_TARGETS = ["server", "web", "packages"];

function resolveCommitSha(provided) {
  if (provided) return provided;
  if (process.env.COMMIT_SHA) return process.env.COMMIT_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;

  try {
    const result = spawnSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf-8",
    });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
  } catch (error) {
    // fall through
  }

  throw new Error("Unable to determine commit SHA for supply chain artifacts");
}

function resolveCommitTimestamp(commitSha) {
  try {
    const result = spawnSync("git", ["show", "-s", "--format=%cI", commitSha], {
      encoding: "utf-8",
    });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
  } catch (error) {
    // fall back to current time
  }
  return new Date().toISOString();
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, serialized + "\n");
  return hashContent(serialized);
}

function readPackageJson(targetDir) {
  try {
    const manifestPath = path.join(targetDir, "package.json");
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    }
  } catch (error) {
    // ignore – a missing manifest just means fewer components
  }
  return null;
}

function collectComponents(target, rootDir) {
  const components = [];

  const pushComponent = (name, version) => {
    if (!name || !version) return;
    components.push({
      type: "library",
      name,
      version,
    });
  };

  if (target === "packages") {
    const packagesDir = path.join(rootDir, "packages");
    if (fs.existsSync(packagesDir)) {
      const packageFolders = fs
        .readdirSync(packagesDir)
        .map((entry) => path.join(packagesDir, entry))
        .filter((entryPath) => fs.lstatSync(entryPath).isDirectory());

      for (const folder of packageFolders) {
        const manifest = readPackageJson(folder);
        if (manifest?.name && manifest?.version) {
          pushComponent(manifest.name, manifest.version);
        }
      }
    }
  } else {
    const targetDir = path.join(rootDir, target === "web" ? "client" : target);
    const manifest = readPackageJson(targetDir);
    if (manifest?.name && manifest?.version) {
      pushComponent(manifest.name, manifest.version);
    }

    const deps = manifest?.dependencies || {};
    for (const [name, version] of Object.entries(deps)) {
      pushComponent(name, version);
    }
  }

  return components.sort((a, b) => a.name.localeCompare(b.name));
}

function buildSbomDocument(target, commitSha, timestamp, components) {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.4",
    version: 1,
    metadata: {
      timestamp,
      component: {
        type: "application",
        name: `summit-${target}`,
        version: commitSha,
      },
      tools: [
        {
          vendor: "Summit",
          name: "supply-chain-artifacts",
          version: "1.0.0",
        },
      ],
    },
    components,
  };
}

function generateSboms({
  commitSha,
  commitTimestamp,
  rootDir = process.cwd(),
  artifactsDir = path.join(process.cwd(), "artifacts", "sbom"),
  targets = DEFAULT_TARGETS,
}) {
  const results = [];

  for (const target of targets) {
    const components = collectComponents(target, rootDir);
    const document = buildSbomDocument(target, commitSha, commitTimestamp, components);

    const filename = `sbom-${target}-${commitSha}.cdx.json`;
    const destination = path.join(artifactsDir, filename);
    const hash = writeJson(destination, document);

    results.push({
      target,
      path: destination,
      hash,
      componentsCount: components.length,
    });
  }

  return results;
}

function normalizeAuditSummary(raw) {
  const summary = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };

  const source =
    raw?.metadata?.vulnerabilities ||
    raw?.advisories ||
    raw?.vulnerabilities ||
    raw?.auditReport?.vulnerabilities;

  if (source) {
    for (const [severity, value] of Object.entries(source)) {
      if (severity in summary) {
        const total = typeof value === "number" ? value : (value?.count ?? value);
        summary[severity] = Number(total) || 0;
      }
    }
  }

  return summary;
}

function runDependencyAudit({
  cwd = process.cwd(),
  outputPath = path.join(process.cwd(), "artifacts", "dependency-audit.json"),
  auditData,
} = {}) {
  let parsed = auditData;
  if (!parsed) {
    const result = spawnSync("pnpm", ["audit", "--json"], {
      cwd,
      encoding: "utf-8",
    });

    if (result.error) {
      throw new Error(`Dependency audit failed to start: ${result.error.message}`);
    }

    if (result.stdout) {
      try {
        parsed = JSON.parse(result.stdout);
      } catch (error) {
        throw new Error("Dependency audit returned invalid JSON output");
      }
    } else {
      throw new Error("Dependency audit did not produce any output");
    }
  }

  const summary = normalizeAuditSummary(parsed);
  const generatedAt = new Date().toISOString();
  const auditSummary = {
    ...summary,
    generatedAt,
  };

  writeJson(outputPath, auditSummary);

  if (auditSummary.critical > 0) {
    const error = new Error(`Critical vulnerabilities detected: ${auditSummary.critical}`);
    error.summary = auditSummary;
    throw error;
  }

  return auditSummary;
}

function generateProvenance({
  commitSha,
  commitTimestamp,
  workflowName = process.env.GITHUB_WORKFLOW || "local-build",
  nodeVersion = process.version,
  sbomArtifacts,
  auditSummary,
  outputPath = path.join(process.cwd(), "artifacts", "provenance.json"),
  rootDir = process.cwd(),
}) {
  const outputs = sbomArtifacts.map((artifact) => ({
    target: artifact.target,
    path: path.relative(rootDir, artifact.path),
    sha256: artifact.hash,
  }));

  const provenance = {
    commit: commitSha,
    workflow: workflowName,
    nodeVersion,
    generatedAt: commitTimestamp,
    outputs,
    dependencyAudit: auditSummary,
  };

  const hash = writeJson(outputPath, provenance);

  return {
    path: outputPath,
    hash,
    document: provenance,
  };
}

function generateSupplyChainArtifacts({
  commitSha,
  rootDir = process.cwd(),
  artifactsDir = path.join(process.cwd(), "artifacts", "sbom"),
  provenancePath = path.join(process.cwd(), "artifacts", "provenance.json"),
  auditPath = path.join(process.cwd(), "artifacts", "dependency-audit.json"),
  targets = DEFAULT_TARGETS,
  workflowName,
  auditRunner = runDependencyAudit,
} = {}) {
  const resolvedSha = resolveCommitSha(commitSha);
  const commitTimestamp = resolveCommitTimestamp(resolvedSha);

  const sboms = generateSboms({
    commitSha: resolvedSha,
    commitTimestamp,
    rootDir,
    artifactsDir,
    targets,
  });

  const auditSummary = auditRunner({ cwd: rootDir, outputPath: auditPath });

  const provenance = generateProvenance({
    commitSha: resolvedSha,
    commitTimestamp,
    workflowName,
    nodeVersion: process.version,
    sbomArtifacts: sboms,
    auditSummary,
    outputPath: provenancePath,
    rootDir,
  });

  return {
    commitSha: resolvedSha,
    sboms,
    provenance,
    auditSummary,
  };
}

function validateSupplyChainArtifacts({
  commitSha,
  rootDir = process.cwd(),
  artifactsDir = path.join(process.cwd(), "artifacts", "sbom"),
  provenancePath = path.join(process.cwd(), "artifacts", "provenance.json"),
  auditPath = path.join(process.cwd(), "artifacts", "dependency-audit.json"),
  targets = DEFAULT_TARGETS,
} = {}) {
  const reasons = [];
  const resolvedSha = resolveCommitSha(commitSha);

  const missingTargets = [];
  const targetArtifacts = [];

  for (const target of targets) {
    const sbomPath = path.join(artifactsDir, `sbom-${target}-${resolvedSha}.cdx.json`);
    if (!fs.existsSync(sbomPath)) {
      missingTargets.push(target);
      reasons.push(`Missing SBOM for ${target}`);
      continue;
    }
    const content = fs.readFileSync(sbomPath, "utf-8");
    targetArtifacts.push({
      target,
      path: sbomPath,
      hash: hashContent(content),
    });
  }

  let provenancePresent = false;
  let provenanceValid = false;

  if (fs.existsSync(provenancePath)) {
    provenancePresent = true;
    try {
      const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf-8"));
      if (provenance.commit !== resolvedSha) {
        reasons.push("Provenance commit SHA does not match expected commit");
      }

      const outputHashes = new Map(
        (provenance.outputs || []).map((output) => [output.target, output.sha256])
      );

      const missingOutputs = targets.filter((t) => !outputHashes.has(t));
      if (missingOutputs.length) {
        reasons.push(`Provenance missing outputs for: ${missingOutputs.join(", ")}`);
      }

      const mismatched = targetArtifacts.filter((artifact) => {
        const recordedHash = outputHashes.get(artifact.target);
        return recordedHash && recordedHash !== artifact.hash;
      });

      if (mismatched.length) {
        reasons.push(`Provenance hash mismatch for: ${mismatched.map((a) => a.target).join(", ")}`);
      }

      provenanceValid = missingOutputs.length === 0 && mismatched.length === 0;
    } catch (error) {
      reasons.push("Failed to parse provenance document");
    }
  } else {
    reasons.push("Provenance file is missing");
  }

  let dependencyAuditPassed = false;
  if (fs.existsSync(auditPath)) {
    try {
      const audit = JSON.parse(fs.readFileSync(auditPath, "utf-8"));
      dependencyAuditPassed = Number(audit.critical || 0) === 0;
      if (!dependencyAuditPassed) {
        reasons.push("Critical vulnerabilities found in dependency audit");
      }
    } catch (error) {
      reasons.push("Dependency audit summary is invalid");
    }
  } else {
    reasons.push("Dependency audit summary is missing");
  }

  const passed = missingTargets.length === 0 && provenanceValid && dependencyAuditPassed;

  return {
    passed,
    reasons,
    details: {
      commitSha: resolvedSha,
      missingTargets,
      provenancePresent,
      provenanceValid,
      dependencyAuditPassed,
      targetArtifacts,
    },
  };
}

function runCli() {
  const command = process.argv[2] || "generate";
  const commitSha = process.env.COMMIT_SHA || process.env.GITHUB_SHA;

  if (command === "generate") {
    const result = generateSupplyChainArtifacts({ commitSha });
    console.log(
      `Generated SBOMs for ${result.sboms.length} targets and provenance at ${result.provenance.path}`
    );
    return;
  }

  if (command === "verify") {
    const validation = validateSupplyChainArtifacts({ commitSha });
    if (!validation.passed) {
      console.error("Supply chain gate failed:");
      for (const reason of validation.reasons) {
        console.error(`- ${reason}`);
      }
      process.exit(1);
    }
    console.log("Supply chain gate passed");
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildSbomDocument,
  collectComponents,
  generateProvenance,
  generateSboms,
  generateSupplyChainArtifacts,
  normalizeAuditSummary,
  runDependencyAudit,
  validateSupplyChainArtifacts,
};
