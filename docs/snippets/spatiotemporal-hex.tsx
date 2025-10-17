import { DeckGL } from '@deck.gl/react';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { MapView } from '@deck.gl/core';
import { useMemo, useState } from 'react';

type Datum = {
  lat: number;
  lon: number;
  ts: number;
  value: number;
  uncertainty: number;
  sources: string[];
};

export function SpatioTemporalHex({
  data,
  window
}: {
  data: Datum[];
  window: [number, number];
}) {
  const [range, setRange] = useState(window);

  const filtered = useMemo(
    () => data.filter((d) => d.ts >= range[0] && d.ts <= range[1]),
    [data, range]
  );

  const layer = new HexagonLayer({
    id: 'signal-hex',
    data: filtered,
    getPosition: (d: Datum) => [d.lon, d.lat],
    getElevationWeight: (d: Datum) => d.value,
    getColorWeight: (d: Datum) => 1 - d.uncertainty,
    colorAggregation: 'MEAN',
    elevationScale: 12,
    extruded: true,
    radius: 500,
    pickable: true,
    onHover: (info) => {
      if (info.object) {
        const { value, uncertainty, sources } = info.object;
        console.log({ value, uncertainty, sources });
      }
    }
  });

  return (
    <DeckGL
      views={new MapView({ repeat: true })}
      controller
      layers={[layer]}
    />
  );
}
