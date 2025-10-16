import qutip from 'qutip';

export function quantumEcosystemSanctuary(config) {
  const sanctuary = qutip.sanctuary({ scale: config.globalImpact });
  return {
    sanctuary: `Quantum ecosystem sanctuary at ${config.globalImpact} scale`,
  };
}
