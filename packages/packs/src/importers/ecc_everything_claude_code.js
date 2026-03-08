"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PINNED_COMMIT = exports.ECC_REPO = void 0;
exports.importECCPack = importECCPack;
exports.ECC_REPO = "https://github.com/affaan-m/everything-claude-code";
exports.PINNED_COMMIT = "e83c2a...pinned"; // Placeholder
async function importECCPack() {
    // In a real scenario, this would git clone/fetch the repo at the pinned commit
    // and traverse the directory to build the manifest.
    // For this MWS, we return a static structure based on the prompt's analysis.
    const manifest = {
        name: "ecc/everything-claude-code",
        version: "0.1.0",
        upstream: {
            repo: exports.ECC_REPO,
            commit: exports.PINNED_COMMIT,
            license: "MIT",
        },
        content: {
            agents: ["planner", "architect", "code-reviewer"],
            skills: ["tdd-workflow", "verification-loop"],
            hooks: ["tmux-reminder", "git-push-pause", "console-log-guardrail"],
            mcpProfiles: ["safe-default"],
            rules: ["no-broken-promises"],
        },
        checksumsFile: "checksums.json",
    };
    const checksums = {
        "agents/planner": "sha256:...",
        "skills/tdd-workflow": "sha256:...",
        // ... placeholders
    };
    return { manifest, checksums };
}
