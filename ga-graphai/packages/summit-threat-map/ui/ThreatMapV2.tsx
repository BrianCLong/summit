import { useEffect, useMemo, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface ThreatMapV2Props {
  mapboxToken: string;
  tileUrlTemplate: string;
  defaultBucket?: '1m' | '5m';
}

export function ThreatMapV2({ mapboxToken, tileUrlTemplate, defaultBucket = '5m' }: ThreatMapV2Props) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Array<{ observed_at: string; evidence: { why: string; citations: string[] } }>>([]);

  const sourceTiles = useMemo(() => [tileUrlTemplate], [tileUrlTemplate]);

  useEffect(() => {
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: 'threat-map-v2',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 20],
      zoom: 1.6,
    });

    map.on('load', () => {
      map.addSource('threat-cells', {
        type: 'vector',
        tiles: sourceTiles,
      });

      map.addLayer({
        id: 'threat-cells-fill',
        type: 'fill',
        source: 'threat-cells',
        'source-layer': 'hex_cell_risk',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0, '#123b64',
            0.4, '#1e7fb3',
            0.7, '#f59e0b',
            1, '#ef4444',
          ],
          'fill-opacity': 0.68,
        },
      });

      map.on('click', 'threat-cells-fill', async (event) => {
        const feature = event.features?.[0];
        const h3 = feature?.properties?.h3_index;
        if (!h3) {
          return;
        }
        setSelectedCell(h3);
        const response = await fetch(`/cell/${h3}?limit=20`);
        const payload = await response.json();
        setEvidence(payload.events ?? []);
      });
    });

    return () => map.remove();
  }, [mapboxToken, sourceTiles, defaultBucket]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '12px', height: '100%' }}>
      <div id="threat-map-v2" style={{ minHeight: '560px' }} />
      <aside style={{ padding: '12px', background: '#0f172a', color: '#e2e8f0' }}>
        <h3>Cell drilldown</h3>
        <p>Selected: {selectedCell ?? 'none'}</p>
        <ul>
          {evidence.map((row, index) => (
            <li key={`${row.observed_at}-${index}`}>
              <strong>{new Date(row.observed_at).toLocaleString()}</strong>
              <div>{row.evidence?.why}</div>
              <small>{row.evidence?.citations?.join(', ')}</small>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
