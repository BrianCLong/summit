import { readFileSync } from 'node:fs';
import { buildEvidFromInputs } from '../evidence/evid';
import { writeEvidenceFiles } from '../evidence/writer';
import { reverseImageFromFixture } from './steps/reverse_image';
import { archiveFromFixture } from './steps/archive';
import { geolocateHintFromFixture } from './steps/geolocate_hint';
import { chronolocateShadowFromFixture } from './steps/chronolocate_shadow';

type WorkflowStep = {
  id: string;
  type: string;
  mode: 'offline_fixture' | 'live';
  fixture?: string;
  connector?: string;
};

type WorkflowSpec = {
  inputs: Record<string, unknown>;
  evidence: { out_dir: string; evid_prefix: string };
  policy: { network: 'deny' | 'allow'; connectors: { allowlist: string[] } };
  steps: WorkflowStep[];
};

function executeStep(step: WorkflowStep): Record<string, unknown> {
  switch (step.type) {
    case 'reverse_image':
      return reverseImageFromFixture(step.fixture!);
    case 'archive':
      return archiveFromFixture(step.fixture!);
    case 'geolocate_hint':
      return geolocateHintFromFixture(step.fixture!);
    case 'chronolocate_shadow':
      return chronolocateShadowFromFixture(step.fixture!);
    default:
      return {};
  }
}

export function runWorkflowSpec(workflow: WorkflowSpec, fixedDateStamp = '20260226') {
  const { evid, inputManifestSha256 } = buildEvidFromInputs(workflow.inputs, fixedDateStamp);

  const stepResults = workflow.steps.map((step) => {
    const connector = step.connector ?? step.type;
    if (step.mode === 'live' && workflow.policy.network === 'deny') {
      return {
        step_id: step.id,
        type: step.type,
        mode: step.mode,
        status: 'blocked' as const,
        artifacts: [],
        reason: 'policy.network=deny blocks live mode',
      };
    }
    if (!workflow.policy.connectors.allowlist.includes(connector) && step.mode === 'live') {
      return {
        step_id: step.id,
        type: step.type,
        mode: step.mode,
        status: 'blocked' as const,
        artifacts: [],
        reason: `connector ${connector} not allowlisted`,
      };
    }

    const payload = step.fixture ? executeStep(step) : {};
    return {
      step_id: step.id,
      type: step.type,
      mode: step.mode,
      status: 'ok' as const,
      artifacts: Object.keys(payload).length ? [step.fixture ?? `${step.id}.json`] : [],
    };
  });

  return writeEvidenceFiles(
    workflow.evidence.out_dir,
    {
      evid,
      inputs: workflow.inputs,
      policy: workflow.policy,
      steps: stepResults,
      findings: stepResults.filter((s) => s.status === 'ok').map((s) => ({ step_id: s.step_id, status: s.status })),
    },
    inputManifestSha256,
  );
}

export function loadJsonWorkflow(path: string): WorkflowSpec {
  return JSON.parse(readFileSync(path, 'utf8')) as WorkflowSpec;
}
