import React from 'react';
import LineTimeseries from '../components/charts/LineTimeseries';

export default function SLOBurnChart() {
  const series = Array.from({ length: 24 }, (_, i) => ({
    x: `${i}:00`,
    y: Math.max(0, Math.round((Math.sin(i / 3) + 1) * 20)),
  }));
  return (
    <div className="p-6">
      <LineTimeseries
        title="SLO Burn (demo)"
        data={series}
        ariaLabel="SLO burn trend"
      />
    </div>
  );
}
