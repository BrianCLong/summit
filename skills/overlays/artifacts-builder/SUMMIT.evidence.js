"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSkillEvidence = void 0;
const buildSkillEvidence = (data) => ({
    skill: data.skill ?? "artifacts-builder",
    inputs: data.inputs ?? {},
    tool_calls: data.tool_calls ?? [],
    outputs: data.outputs ?? {},
    diffs: data.diffs ?? { files: [], summary: "" },
    checksums: data.checksums ?? {},
    policy: data.policy ?? { allow: false, denies: [] },
    timestamp: data.timestamp ?? new Date().toISOString(),
});
exports.buildSkillEvidence = buildSkillEvidence;
