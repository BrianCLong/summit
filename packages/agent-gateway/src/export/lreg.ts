import axios from 'axios';
import { ensureCoverage } from '../dissent/gate';

export async function exportLREG(
  runId: string,
  caseId: string,
  kpwBundle: unknown,
  aer: unknown,
  policyLogs: unknown[],
) {
  const coverage = await ensureCoverage(runId, 0.7);
  const { data } = await axios.post(
    process.env.LREG_URL || 'http://lreg-exporter:7301/lreg/export',
    {
      runId,
      caseId,
      kpwBundle,
      aer,
      policyLogs,
      dissentCoverage: coverage,
    },
    { responseType: 'arraybuffer' },
  );
  return data; // zip bytes; persist to evidence store
}
