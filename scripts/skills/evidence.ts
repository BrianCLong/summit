import { promises as fs } from 'node:fs';
import path from 'node:path';

export type SkillEvidenceBundle = {
  skill: string;
  inputs: Record<string, unknown>;
  tool_calls: Array<Record<string, unknown>>;
  outputs: Record<string, unknown>;
  diffs: {
    files: string[];
    summary: string;
  };
  checksums: Record<string, string>;
  policy: {
    allow: boolean;
    denies: string[];
  };
  timestamp: string;
};

export const buildEvidenceBundle = (
  data: Partial<SkillEvidenceBundle>,
): SkillEvidenceBundle => ({
  skill: data.skill ?? 'unknown-skill',
  inputs: data.inputs ?? {},
  tool_calls: data.tool_calls ?? [],
  outputs: data.outputs ?? {},
  diffs: data.diffs ?? { files: [], summary: '' },
  checksums: data.checksums ?? {},
  policy: data.policy ?? { allow: false, denies: [] },
  timestamp: data.timestamp ?? new Date().toISOString(),
});

export const writeEvidenceBundle = async (
  baseDir: string,
  bundle: SkillEvidenceBundle,
  filename = 'skill-run.json',
): Promise<string> => {
  await fs.mkdir(baseDir, { recursive: true });
  const outputPath = path.join(baseDir, filename);
  await fs.writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  return outputPath;
};
