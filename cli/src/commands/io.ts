import { Command } from "commander";
import * as path from "path";
import {
  readCaseSpec,
  deriveRunId8,
  resolveGitSha7,
  buildEvidenceId,
  buildArtifacts,
  writeArtifacts,
  utcDate,
} from "../lib/io-case-runner.js";
import { error, success } from "../utils/output.js";

interface RunCaseOptions {
  case: string;
  tenant: string;
  domain: string;
  artifact: string;
  date?: string;
  runId?: string;
  gitSha?: string;
  out: string;
  output: "text" | "json";
}

function resolveRunId(runId: string | undefined, derivedRunId: string): string {
  if (!runId) {
    return derivedRunId;
  }

  const normalized = runId.toLowerCase();
  if (!/^[a-f0-9]{8}$/.test(normalized)) {
    throw new Error("run-id must be an 8-character lowercase hex string");
  }

  return normalized;
}

export function registerIOCommands(program: Command): void {
  const io = program.command("io").description("Influence operations case execution tooling");

  io.command("run-case")
    .description(
      "Run a case-as-code skeleton and emit deterministic report/metrics/stamp artifacts"
    )
    .requiredOption("--case <path>", "Path to case file (.yaml/.yml/.json)")
    .requiredOption("--tenant <tenant>", "Tenant segment for Evidence ID (e.g. acme)")
    .requiredOption("--artifact <artifact>", "Artifact segment for Evidence ID (e.g. cib_eval)")
    .option("--domain <domain>", "Domain segment for Evidence ID", "io")
    .option("--date <yyyy-mm-dd>", "Evidence date in UTC")
    .option("--run-id <runid8>", "8-char run id override; defaults to case hash prefix")
    .option("--git-sha <gitsha7>", "7-char git SHA override; defaults to current HEAD")
    .option("-o, --out <dir>", "Output directory root", "evidence/io-cases")
    .option("--output <format>", "Output format (text|json)", "text")
    .action((opts: RunCaseOptions) => {
      try {
        const casePath = path.resolve(opts.case);
        const caseSpec = readCaseSpec(casePath);
        const gitsha7 = resolveGitSha7(opts.gitSha);
        const evidenceDate = opts.date ?? utcDate();
        const runid8 = resolveRunId(opts.runId, deriveRunId8(caseSpec));

        const evidenceId = buildEvidenceId({
          tenant: opts.tenant,
          domain: opts.domain,
          artifact: opts.artifact,
          date: evidenceDate,
          gitsha7,
          runid8,
        });

        const outputDir = path.resolve(
          opts.out,
          opts.tenant,
          opts.domain,
          opts.artifact,
          evidenceDate,
          runid8
        );

        const artifacts = buildArtifacts({
          caseSpec,
          casePath,
          tenant: opts.tenant,
          domain: opts.domain,
          artifact: opts.artifact,
          evidenceDate,
          gitsha7,
          runid8,
          evidenceId,
        });

        const paths = writeArtifacts(outputDir, artifacts);
        const payload = {
          evidence_id: evidenceId,
          output_dir: outputDir,
          report: paths.reportPath,
          metrics: paths.metricsPath,
          stamp: paths.stampPath,
          case_id: caseSpec.case_id,
        };

        if (opts.output === "json") {
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        success(`IO case artifacts generated: ${evidenceId}`);
        console.log(`Case: ${caseSpec.case_id}`);
        console.log(`Output: ${outputDir}`);
        console.log(`- report.json: ${paths.reportPath}`);
        console.log(`- metrics.json: ${paths.metricsPath}`);
        console.log(`- stamp.json: ${paths.stampPath}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message);
        process.exit(1);
      }
    });
}
