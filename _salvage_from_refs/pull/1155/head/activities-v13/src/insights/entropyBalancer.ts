import qutip from 'qutip';

export function entropyBalancer(config) {
  const balance = qutip.balance({ entropy: config.collaborationIntensity });
  return { balance: `System stability at ${config.collaborationIntensity} level` };
}