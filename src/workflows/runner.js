"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWorkflowSpec = runWorkflowSpec;
exports.loadJsonWorkflow = loadJsonWorkflow;
const node_fs_1 = require("node:fs");
const evid_1 = require("../evidence/evid");
const writer_1 = require("../evidence/writer");
const reverse_image_1 = require("./steps/reverse_image");
const archive_1 = require("./steps/archive");
const geolocate_hint_1 = require("./steps/geolocate_hint");
const chronolocate_shadow_1 = require("./steps/chronolocate_shadow");
function executeStep(step) {
    switch (step.type) {
        case 'reverse_image':
            return (0, reverse_image_1.reverseImageFromFixture)(step.fixture);
        case 'archive':
            return (0, archive_1.archiveFromFixture)(step.fixture);
        case 'geolocate_hint':
            return (0, geolocate_hint_1.geolocateHintFromFixture)(step.fixture);
        case 'chronolocate_shadow':
            return (0, chronolocate_shadow_1.chronolocateShadowFromFixture)(step.fixture);
        default:
            return {};
    }
}
function runWorkflowSpec(workflow, fixedDateStamp = '20260226') {
    const { evid, inputManifestSha256 } = (0, evid_1.buildEvidFromInputs)(workflow.inputs, fixedDateStamp);
    const stepResults = workflow.steps.map((step) => {
        const connector = step.connector ?? step.type;
        if (step.mode === 'live' && workflow.policy.network === 'deny') {
            return {
                step_id: step.id,
                type: step.type,
                mode: step.mode,
                status: 'blocked',
                artifacts: [],
                reason: 'policy.network=deny blocks live mode',
            };
        }
        if (!workflow.policy.connectors.allowlist.includes(connector) && step.mode === 'live') {
            return {
                step_id: step.id,
                type: step.type,
                mode: step.mode,
                status: 'blocked',
                artifacts: [],
                reason: `connector ${connector} not allowlisted`,
            };
        }
        const payload = step.fixture ? executeStep(step) : {};
        return {
            step_id: step.id,
            type: step.type,
            mode: step.mode,
            status: 'ok',
            artifacts: Object.keys(payload).length ? [step.fixture ?? `${step.id}.json`] : [],
        };
    });
    return (0, writer_1.writeEvidenceFiles)(workflow.evidence.out_dir, {
        evid,
        inputs: workflow.inputs,
        policy: workflow.policy,
        steps: stepResults,
        findings: stepResults.filter((s) => s.status === 'ok').map((s) => ({ step_id: s.step_id, status: s.status })),
    }, inputManifestSha256);
}
function loadJsonWorkflow(path) {
    return JSON.parse((0, node_fs_1.readFileSync)(path, 'utf8'));
}
