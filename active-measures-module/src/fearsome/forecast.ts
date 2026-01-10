import { execFileSync } from 'child_process';

export function forecastBehavior(plan: any) {
  const pyCode = `
import torch
lstm = torch.nn.LSTM(1,1)
print('Altered timelines')
  `;
  // Use execFileSync to avoid shell injection
  return execFileSync('python', ['-c', pyCode]).toString();
}
