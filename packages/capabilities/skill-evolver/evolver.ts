import { evaluateCapability } from '../capability-evaluator/evaluator';
import { retrainCapability } from './retrain';

export const evolveCapability = async (capabilityId: string) => {
  const metrics = await evaluateCapability(capabilityId);

  if (metrics.overall < 0.75) {
    console.log(`Capability ${capabilityId} under threshold. Evolving...`);
    await retrainCapability(capabilityId);
  } else {
    console.log(`Capability ${capabilityId} passes evaluation.`);
  }
};
