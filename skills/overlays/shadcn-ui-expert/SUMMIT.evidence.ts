export type SkillEvidence = {
  skill: string;
  inputs: Record<string, unknown>;
  tool_calls: Array<Record<string, unknown>>;
  outputs: Record<string, unknown>;
  diffs: { files: string[]; summary: string };
  checksums: Record<string, string>;
  policy: { allow: boolean; denies: string[] };
  timestamp: string;
};

export const buildSkillEvidence = (data: Partial<SkillEvidence>): SkillEvidence => ({
  skill: data.skill ?? "shadcn-ui-expert",
  inputs: data.inputs ?? {},
  tool_calls: data.tool_calls ?? [],
  outputs: data.outputs ?? {},
  diffs: data.diffs ?? { files: [], summary: "" },
  checksums: data.checksums ?? {},
  policy: data.policy ?? { allow: false, denies: [] },
  timestamp: data.timestamp ?? new Date().toISOString(),
});
