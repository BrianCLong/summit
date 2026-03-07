import React from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { DiffusionGeoJson } from "../../types/cultural";

export function DiffusionHeatmap(props: {
  data: DiffusionGeoJson | null;
  onSelectRegion?: (regionId: string) => void;
}) {
  if (!props.data) {
    return <div className="rounded-2xl border p-4">No diffusion data loaded.</div>;
  }

  const fillLayer = {
    id: "diffusion-fill",
    type: "fill" as const,
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "diffusionProbability"], 0],
        0, "#0f172a",
        0.25, "#1d4ed8",
        0.5, "#0ea5e9",
        0.75, "#f59e0b",
        1, "#dc2626"
      ],
      "fill-opacity": 0.5
    }
  };

  const lineLayer = {
    id: "diffusion-outline",
    type: "line" as const,
    paint: {
      "line-color": "#0f172a",
      "line-width": 1
    }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="text-lg font-semibold">Narrative Diffusion Heatmap</div>
      <div className="text-sm text-muted-foreground">
        H3 cell polygons colored by diffusion probability.
      </div>

      <div className="rounded-2xl overflow-hidden border">
        <Map
          initialViewState={{
            longitude: 10,
            latitude: 51,
            zoom: 3
          }}
          style={{ width: "100%", height: 420 }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          interactiveLayerIds={["diffusion-fill"]}
          onClick={(event) => {
            const feature = event.features?.[0];
            const regionId = feature?.properties?.regionId;
            if (typeof regionId === "string") {
              props.onSelectRegion?.(regionId);
            }
          }}
        >
          <Source id="diffusion" type="geojson" data={props.data}>
            <Layer {...fillLayer} />
            <Layer {...lineLayer} />
          </Source>
        </Map>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border p-2">Low: blue</div>
        <div className="rounded-xl border p-2">High: red</div>
      </div>
    </div>
  );
}
