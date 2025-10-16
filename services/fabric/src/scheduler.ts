import { execFile } from 'child_process';

import {
  FabricDistillationContext,
  FabricDistillationEngine,
  Quote,
} from './distillation';

const fabricDistiller = new FabricDistillationEngine();

export async function pickPool(
  quotes: Quote[],
  needGpu = false,
  context: FabricDistillationContext = {},
) {
  const ranking = fabricDistiller.rankQuotes(quotes, { ...context, needGpu });
  if (ranking.length === 0) {
    throw new Error('No capacity quotes available for selection');
  }

  const top = ranking[0];
  console.log(
    `🎛️ Fabric distiller selected ${top.quote.provider}/${top.quote.region} ` +
      `score=${top.score.toFixed(2)} rationale=${top.rationale.join(' | ')}`,
  );

  return top.quote;
}

export async function spawnRunner(
  pool: Quote,
  label: string,
  outcome?: { success?: boolean },
) {
  // Assume prebuilt images & cloud CLIs available; replace with Terraform if desired
  const plan = fabricDistiller.prepareLaunchPlan(pool, label);
  const name = `maestro-${label}-${Date.now()}`;

  console.log(
    `🚀 Provisioning ${name} via ${pool.provider} (${pool.region}) ` +
      `latency≈${plan.expectedLatency.toFixed(0)}ms cost≈${plan.expectedCost.toFixed(2)}/hr`,
  );

  if (pool.provider === 'aws') {
    await run('aws', [
      'ec2',
      'run-instances',
      '--instance-type',
      'c7g.large',
      '--instance-market-options',
      'MarketType=spot',
      '--tag-specifications',
      `ResourceType=instance,Tags=[{Key=Name,Value=${name}}]`,
    ]);
  }

  if (pool.provider === 'gcp') {
    await run('gcloud', [
      'compute',
      'instances',
      'create-with-container',
      name,
      '--machine-type=e2-standard-4',
      '--preemptible',
    ]);
  }

  if (pool.provider === 'azure') {
    await run('az', [
      'vm',
      'create',
      '--resource-group',
      `maestro-${pool.region}`,
      '--name',
      name,
      '--image',
      'Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest',
      '--priority',
      'Spot',
    ]);
  }

  if (typeof outcome?.success === 'boolean') {
    fabricDistiller.recordOutcome(pool, outcome.success);
  }
  // register as GH runner via ephemeral token (omitted for brevity)
}

export function getFabricDistillationSnapshot() {
  return fabricDistiller.getSnapshot();
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) =>
    execFile(cmd, args, (error, _stdout, stderr) =>
      error ? reject(stderr || error) : resolve(),
    ),
  );
}
