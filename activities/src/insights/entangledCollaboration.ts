import sympy from 'sympy';
import qutip from 'qutip';

export function entangledCollaboration(config) {
  const collaboration = sympy.polymorphic(
    qutip.entangle({ precision: config.opportunityPrecision }),
  );
  return {
    collaboration: `Quantum-entangled collaboration at ${config.opportunityPrecision} precision`,
  };
}
