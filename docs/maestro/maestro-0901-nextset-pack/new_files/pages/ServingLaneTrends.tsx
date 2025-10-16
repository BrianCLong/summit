import React, { useEffect, useState } from 'react';
import LineTimeseries from '../components/charts/LineTimeseries';
import { getServingMetrics } from '../api';

export default function ServingLaneTrends() {
  const [seriesQ, setSeriesQ] = useState<{ x: string; y: number }[]>([]);
  const [seriesB, setSeriesB] = useState<{ x: string; y: number }[]>([]);
  const [seriesK, setSeriesK] = useState<{ x: string; y: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      getServingMetrics?.()
        .then((r: any) => {
          const toPts = (arr: any[]) =>
            (arr || []).map((p: any) => ({
              x: new Date(p.ts).toLocaleTimeString(),
              y: p.value,
            }));
          setSeriesQ(toPts(r?.series?.qDepth || r?.seriesQ || []));
          setSeriesB(toPts(r?.series?.batch || r?.seriesBatch || []));
          setSeriesK(toPts(r?.series?.kvHit || r?.seriesKv || []));
        })
        .catch((e) => setErr(String(e)));
    load();
    const h = setInterval(load, 5000);
    return () => clearInterval(h);
  }, []);

  return (
    <section className="space-y-3">
      <LineTimeseries
        title="Queue Depth"
        data={seriesQ}
        ariaLabel="Serving lane queue depth over time"
      />
      <LineTimeseries
        title="Batch Size"
        data={seriesB}
        ariaLabel="Serving lane batch size over time"
      />
      <LineTimeseries
        title="KV Hit Ratio"
        data={seriesK}
        ariaLabel="Serving lane KV hit ratio over time"
      />
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </section>
  );
}
