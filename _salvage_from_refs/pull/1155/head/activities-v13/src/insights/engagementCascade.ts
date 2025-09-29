import torch from 'torch';

export function engagementCascade(config) {
  const cascade = torch.recursive({ scale: config.globalImpact });
  return { cascade: `Engagement cascade at ${config.globalImpact} scale` };
}