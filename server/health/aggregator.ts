import { getCiSignal } from './ci-signal';
import { getP95Latency } from './p95-latency';
import { getGraphConsistency } from './graph-consistency';
import { getErrorTaxonomies } from './error-taxonomies';
import { getSecretDrift } from './secret-drift';
import { getPredictiveAnomalyDetection } from './predictive-anomaly-detection';

export const getHealthScore = async () => {
  const ciSignal = await getCiSignal();
  const p95Latency = await getP95Latency();
  const graphConsistency = await getGraphConsistency();
  const errorTaxonomies = await getErrorTaxonomies();
  const secretDrift = await getSecretDrift();
  const predictiveAnomalyDetection = await getPredictiveAnomalyDetection();

  const scores = [
    ciSignal.score,
    p95Latency.score,
    graphConsistency.score,
    errorTaxonomies.score,
    secretDrift.score,
    predictiveAnomalyDetection.score,
  ];

  const totalScore = scores.reduce((acc, score) => acc + score, 0);
  const healthScore = totalScore / scores.length;

  return {
    healthScore,
    ciSignal,
    p95Latency,
    graphConsistency,
    errorTaxonomies,
    secretDrift,
    predictiveAnomalyDetection,
  };
};
