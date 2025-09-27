import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { CompilationArtifacts, ContractDiff } from './types';
import { loadContract, writeFileRecursive, writeJsonRecursive } from './loader';
import { diffContracts, hasBreakingChanges } from './diff';
import { buildProviderTest, providerFixtureName, providerTestFileName } from './generator/providerTestGenerator';
import { buildConsumerTest, consumerTestFileName } from './generator/consumerTestGenerator';
import { buildGithubAction } from './generator/githubActionGenerator';
import { buildHtmlReport } from './generator/htmlReport';
import { buildGoldenSample } from './generator/goldenSampleGenerator';

export { diffContracts, hasBreakingChanges };

export async function compileContract(options: {
  contractPath: string;
  outputDir: string;
  baselinePath?: string;
  reportPath?: string;
  regenerateSamples?: boolean;
}): Promise<CompilationArtifacts> {
  const contract = await loadContract(options.contractPath);
  const baseline = options.baselinePath ? await loadContract(options.baselinePath) : undefined;
  const diffs: ContractDiff[] = baseline ? diffContracts(baseline, contract) : [];
  const providerPath = path.join(options.outputDir, 'provider', providerTestFileName(contract));
  const consumerPath = path.join(options.outputDir, 'consumer', consumerTestFileName(contract));
  const githubActionPath = path.join(options.outputDir, '.github', 'workflows', 'contract-gate.yml');
  const htmlReportPath = options.reportPath ?? path.join(options.outputDir, 'reports', `${contract.name.replace(/\s+/g, '-')}.html`);
  const fixturePath = path.join(options.outputDir, 'provider', '__fixtures__', providerFixtureName(contract));

  await writeFileRecursive(providerPath, buildProviderTest(contract));
  await writeFileRecursive(consumerPath, buildConsumerTest(contract, diffs));
  await writeFileRecursive(githubActionPath, buildGithubAction());
  await writeFileRecursive(htmlReportPath, buildHtmlReport(contract, diffs));

  let goldenSamplePath: string | undefined;
  if (options.regenerateSamples || !(await fileExists(fixturePath))) {
    const sample = contract.goldenSamples ?? buildGoldenSample(contract);
    await writeJsonRecursive(fixturePath, sample);
    goldenSamplePath = fixturePath;
  }

  return {
    providerTestsPath: providerPath,
    consumerTestsPath: consumerPath,
    githubActionPath,
    htmlReportPath,
    goldenSamplePath,
    violations: diffs,
  };
}

export async function runDiff(options: {
  base: string;
  target: string;
  report?: string;
}): Promise<ContractDiff[]> {
  const baseContract = await loadContract(options.base);
  const targetContract = await loadContract(options.target);
  const diffs = diffContracts(baseContract, targetContract);
  if (options.report) {
    const html = buildHtmlReport(targetContract, diffs);
    await writeFileRecursive(options.report, html);
  }
  return diffs;
}

export async function regenerateGoldenSamples(options: {
  contractPath: string;
  outputDir: string;
}): Promise<string> {
  const contract = await loadContract(options.contractPath);
  const sample = contract.goldenSamples ?? buildGoldenSample(contract);
  const fixturePath = path.join(options.outputDir, providerFixtureName(contract));
  await writeJsonRecursive(fixturePath, sample);
  return fixturePath;
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    return false;
  }
}
