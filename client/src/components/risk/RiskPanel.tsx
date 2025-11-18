import React from 'react';
import { RiskResult } from '../../../server/src/risk/RiskEngine';

export default function RiskPanel({ result }: { result: RiskResult }) {
  return (
    <div>
      <h3>Risk {result.band}</h3>
      <ul>
        {result.contributions.map((c: any) => (
          <li key={c.feature}>
            {c.feature}: {c.delta.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
