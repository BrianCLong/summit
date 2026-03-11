import { spawnSync } from 'node:child_process';
import path from 'node:path';

export interface CiRiskDriver {
  label: string;
  value: string;
}

export interface HighRiskCandidate {
  id: string;
  summary: string;
  subsystemsTouched: number;
}

export interface CiRiskAssessment {
  repository: string;
  commitsAnalyzed: number;
  prsAnalyzed: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  drivers: CiRiskDriver[];
  instabilityProbability14d: number;
  couplingIndex: number;
  crossSubsystemChangePercent: number;
  dependencyFanInPercent: number;
  highRiskCandidates: HighRiskCandidate[];
}

interface CommitRecord {
  hash: string;
  message: string;
  files: string[];
}

function runGit(repoPath: string, args: string[]): string {
  const result = spawnSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }

  return result.stdout;
}

function subsystemForFile(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const [topLevel] = normalized.split('/');
  return topLevel || 'root';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function assessCiRisk(repoPath: string, maxCommits = 1500): CiRiskAssessment {
  const resolvedRepo = path.resolve(repoPath);
  const repoName = path.basename(resolvedRepo);
  const logDelimiter = '||DELIM||';

  const log = runGit(resolvedRepo, [
    'log',
    `--max-count=${maxCommits}`,
    '--pretty=format:%H||DELIM||%s',
    '--name-only',
  ]);

  const chunks = log
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const commits: CommitRecord[] = chunks
    .map((chunk) => {
      const lines = chunk.split('\n');
      const [header, ...fileLines] = lines;
      const [hash, message] = header.split(logDelimiter);
      if (!hash || !message) {
        return null;
      }
      const files = fileLines.map((line) => line.trim()).filter(Boolean);
      return {
        hash,
        message,
        files,
      };
    })
    .filter((commit): commit is CommitRecord => commit !== null);

  if (commits.length === 0) {
    throw new Error('No commits found for analysis.');
  }

  const mergeCommits = commits.filter((commit) =>
    /merge|conflict|resolve/i.test(commit.message),
  ).length;
  const prsAnalyzed = mergeCommits;

  const subsystemTouches = new Map<string, number>();
  const commitSubsystemCounts: number[] = [];
  let multiSubsystemCommits = 0;

  for (const commit of commits) {
    const subsystems = new Set(commit.files.map(subsystemForFile));
    subsystems.forEach((subsystem) => {
      subsystemTouches.set(subsystem, (subsystemTouches.get(subsystem) ?? 0) + 1);
    });
    commitSubsystemCounts.push(subsystems.size);
    if (subsystems.size >= 2) {
      multiSubsystemCommits += 1;
    }
  }

  const averageSubsystemsTouched =
    commitSubsystemCounts.reduce((sum, count) => sum + count, 0) /
    commitSubsystemCounts.length;

  const couplingIndex = clamp((averageSubsystemsTouched - 1) / 4, 0, 1);
  const crossSubsystemChangePercent = Math.round(
    (multiSubsystemCommits / commits.length) * 100,
  );

  const sortedTouches = [...subsystemTouches.values()].sort((a, b) => b - a);
  const topQuartileCount = Math.max(1, Math.ceil(sortedTouches.length * 0.25));
  const topQuartileAvg =
    sortedTouches.slice(0, topQuartileCount).reduce((sum, count) => sum + count, 0) /
    topQuartileCount;
  const baselineAvg =
    sortedTouches.reduce((sum, count) => sum + count, 0) / sortedTouches.length;

  const dependencyFanInPercent = Math.round(
    clamp(((topQuartileAvg - baselineAvg) / Math.max(1, baselineAvg)) * 100, 0, 100),
  );

  const mergeConflictRate = mergeCommits / commits.length;

  const riskScore = clamp(
    0.35 * couplingIndex +
      0.25 * (crossSubsystemChangePercent / 100) +
      0.25 * (dependencyFanInPercent / 100) +
      0.15 * clamp(mergeConflictRate * 4, 0, 1),
    0,
    1,
  );

  const instabilityProbability14d = Math.round(riskScore * 100);
  const riskLevel = riskScore >= 0.6 ? 'HIGH' : riskScore >= 0.4 ? 'MEDIUM' : 'LOW';

  const highRiskCandidates = commits
    .map((commit) => {
      const subsystems = new Set(commit.files.map(subsystemForFile));
      return {
        id: commit.hash.slice(0, 8),
        summary: commit.message,
        subsystemsTouched: subsystems.size,
      };
    })
    .filter((candidate) => candidate.subsystemsTouched >= 3)
    .slice(0, 3);

  const drivers: CiRiskDriver[] = [
    {
      label: 'Dependency fan-in increase',
      value: `+${dependencyFanInPercent}%`,
    },
    {
      label: 'Cross-subsystem changes',
      value: `+${crossSubsystemChangePercent}%`,
    },
    {
      label: 'Merge conflict frequency',
      value: mergeConflictRate > 0.12 ? 'rising' : 'stable',
    },
    {
      label: 'Coupling index',
      value: couplingIndex.toFixed(2),
    },
  ];

  return {
    repository: repoName,
    commitsAnalyzed: commits.length,
    prsAnalyzed,
    riskScore,
    riskLevel,
    drivers,
    instabilityProbability14d,
    couplingIndex,
    crossSubsystemChangePercent,
    dependencyFanInPercent,
    highRiskCandidates,
  };
}
