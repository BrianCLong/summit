import axios from 'axios';

describe('Model Quality SLOs', () => {
  const base = process.env.METRICS_ENDPOINT || 'http://localhost:8080/metrics-json';
  it('Change-risk AUC ≥ 0.80', async () => {
    const m = (await axios.get(base)).data;
    expect(m.change_risk.auc).toBeGreaterThanOrEqual(0.80);
  });
  it('Intel v4 Brier ≤ 0.15', async () => {
    const m = (await axios.get(base)).data;
    expect(m.intel_v4.brier).toBeLessThanOrEqual(0.15);
  });
});