import { Counter } from 'prom-client';

export const attestationAttempts = new Counter({
  name: 'attestation_attempts_total',
  help: 'Number of attestation verifications'
});
