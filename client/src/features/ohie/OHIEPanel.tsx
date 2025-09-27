import React, { useMemo } from 'react';

type SensitivityPoint = {
  optOutRate: number;
  analyticKpi: number;
  simulatedKpi: number;
  kpiDegradation: number;
};

type SamplingPlan = {
  sampleSize: number;
  achievedError: number;
  dpNoise: number;
  samplingError: number;
  confidence: number;
};

type RiskBrief = {
  title: string;
  mitigations: string[];
  signature: string;
  signedBy: string;
};

type OHIEPayload = {
  scenario: {
    baselineKpi: number;
    optOutRate: number;
    population: number;
    sensitivity: number;
  };
  sensitivityCurve: SensitivityPoint[];
  samplingPlan: SamplingPlan;
  confidenceInterval: [number, number];
  riskBrief: RiskBrief;
};

type Props = {
  data: OHIEPayload;
};

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const decimal = (value: number) => value.toFixed(3);

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--ohie-border, #e2e8f0)',
  borderRadius: 12,
  padding: 16,
  background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
};

const headingStyle: React.CSSProperties = {
  marginBottom: 12,
  fontSize: 18,
  fontWeight: 600,
  color: '#1f2937',
};

export default function OHIEPanel({ data }: Props) {
  const worstPoint = useMemo(() => {
    if (!data.sensitivityCurve.length) {
      return undefined;
    }
    return [...data.sensitivityCurve].sort((a, b) => b.kpiDegradation - a.kpiDegradation)[0];
  }, [data.sensitivityCurve]);

  if (!worstPoint) {
    return null;
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={headingStyle}>Scenario</h3>
        <div style={{ display: 'grid', gap: 6, fontSize: 14, color: '#334155' }}>
          <div>
            Baseline KPI <strong>{decimal(data.scenario.baselineKpi)}</strong> with opt-outs at{' '}
            <strong>{percent(data.scenario.optOutRate)}</strong>.
          </div>
          <div>
            Coverage population <strong>{data.scenario.population.toLocaleString()}</strong> with sensitivity factor{' '}
            <strong>{decimal(data.scenario.sensitivity)}</strong>.
          </div>
          <div>
            Worst degradation {percent(worstPoint.optOutRate)} → {decimal(worstPoint.kpiDegradation)} drop.
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={headingStyle}>Sensitivity Curve</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#1f2937' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Opt-Out</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Analytic KPI</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Simulated KPI</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Δ KPI</th>
            </tr>
          </thead>
          <tbody>
            {data.sensitivityCurve.map((point) => (
              <tr key={point.optOutRate}>
                <td style={{ padding: '4px 0' }}>{percent(point.optOutRate)}</td>
                <td style={{ padding: '4px 0' }}>{decimal(point.analyticKpi)}</td>
                <td style={{ padding: '4px 0' }}>{decimal(point.simulatedKpi)}</td>
                <td style={{ padding: '4px 0' }}>{decimal(point.kpiDegradation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={cardStyle}>
        <h3 style={headingStyle}>DP-Aware Sampling Plan</h3>
        <div style={{ display: 'grid', gap: 8, fontSize: 14, color: '#334155' }}>
          <div>
            Required sample size <strong>{data.samplingPlan.sampleSize.toLocaleString()}</strong> achieves error bound{' '}
            <strong>{decimal(data.samplingPlan.achievedError)}</strong> at {percent(data.samplingPlan.confidence)} confidence.
          </div>
          <div>
            DP noise contribution {decimal(data.samplingPlan.dpNoise)}, sampling error {decimal(data.samplingPlan.samplingError)}.
          </div>
          <div>
            KPI degradation confidence interval{' '}
            <strong>
              {decimal(data.confidenceInterval[0])} – {decimal(data.confidenceInterval[1])}
            </strong>
            .
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={headingStyle}>{data.riskBrief.title}</h3>
        <div style={{ fontSize: 14, color: '#334155', display: 'grid', gap: 6 }}>
          <div>
            Signed by <strong>{data.riskBrief.signedBy}</strong> · Signature{' '}
            <code style={{ fontSize: 12 }}>{data.riskBrief.signature}</code>
          </div>
          <div>
            Mitigation levers:
            <ul style={{ marginTop: 6, paddingLeft: 20 }}>
              {data.riskBrief.mitigations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
