import { spawnSync } from 'child_process';

export type UpgradeRec = {
  name: string;
  version: string;
  ecosystem: 'npm' | 'maven' | 'pypi' | 'nuget';
};

export type GateResult = {
  ok: boolean;
  findings: string[];
};

export async function checkNPMVersion(name: string, version: string): Promise<boolean> {
  try {
    // Check if version exists in the registry using npm view
    // This respects local .npmrc configuration
    const res = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch (e) {
    return false;
  }
}

export async function evaluateAIGrounding(
  recs: UpgradeRec[],
  resolver: (r: UpgradeRec) => Promise<boolean> = async (r) => {
     if (r.ecosystem === 'npm') return checkNPMVersion(r.name, r.version);
     // For MWS, we only implement npm. Others default to 'pass' to avoid blocking valid non-npm usage yet.
     return true;
  }
): Promise<GateResult> {
  const findings: string[] = [];

  for (const r of recs) {
    const exists = await resolver(r);
    if (!exists) {
      findings.push(`Unresolvable recommendation: ${r.ecosystem}:${r.name}@${r.version}`);
    }
  }

  return { ok: findings.length === 0, findings };
}
