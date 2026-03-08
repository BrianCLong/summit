import React, { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { LayerKind } from "./LayerToggles.js";

export type HoverFeatureSummary = {
  id: string;
  explainId: string | null;
  h3: string | null;
  narrativeId: string | null;
  value: string | number | null;
  pressure?: number | null;
  temperature?: number | null;
  stormScore?: number | null;
  turbulence?: number | null;
};

type Props = {
  mapboxToken: string;
  narrativeId: string;
  tsBucket: string;
  layer: LayerKind;
  onExplain: (explainId: string) => void;
  onHoverFeature?: (feature: HoverFeatureSummary | null) => void;
};

function colorExpression(layer: LayerKind) {
  switch (layer) {
    case "pressure":
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "pressure"]], 0],
        0, "#f3f4f6",
        20, "#c7d2fe",
        60, "#818cf8",
        100, "#4338ca",
        150, "#312e81",
      ];
    case "temperature":
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "temperature"]], 0],
        0, "#ecfeff",
        0.25, "#67e8f9",
        0.5, "#22d3ee",
        0.75, "#0891b2",
        1, "#164e63",
      ];
    case "turbulence":
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "turbulence"]], 0],
        0, "#f9fafb",
        0.1, "#fde68a",
        0.25, "#f59e0b",
        0.5, "#b45309",
        1, "#78350f",
      ];
    case "wind":
      return "#93c5fd";
    case "storm":
    default:
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "storm_score"]], 0],
        0, "#f8fafc",
        0.25, "#fecaca",
        0.5, "#f87171",
        0.75, "#dc2626",
        1, "#7f1d1d",
      ];
  }
}

export function MapboxTerrainLayer(props: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sourceId = "coggeo-terrain";
  const fillLayerId = "coggeo-terrain-fill";
  const lineLayerId = "coggeo-terrain-outline";

  const tileUrl = useMemo(() => {
    return (
      `/coggeo/terrain/tiles/{z}/{x}/{y}` +
      `?narrativeId=${encodeURIComponent(props.narrativeId)}` +
      `&tsBucket=${encodeURIComponent(props.tsBucket)}` +
      `&layer=${encodeURIComponent(props.layer)}` +
      `&format=mvt`
    );
  }, [props.narrativeId, props.tsBucket, props.layer]);

  useEffect(() => {
    mapboxgl.accessToken = props.mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-105.55, 39.05],
      zoom: 6,
      attributionControl: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource(sourceId, {
        type: "vector",
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 14,
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "fill-color": colorExpression(props.layer) as any,
          "fill-opacity": 0.7,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "line-color": "#374151",
          "line-width": 0.6,
          "line-opacity": 0.25,
        },
      });

      map.on("mousemove", fillLayerId, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        const p: any = f?.properties ?? {};
        props.onHoverFeature?.({
          id: String(p.id ?? ""),
          explainId: p.explain_id ? String(p.explain_id) : null,
          h3: p.h3 ? String(p.h3) : null,
          narrativeId: p.narrative_id ? String(p.narrative_id) : null,
          value: p.value ?? null,
          pressure: p.pressure != null ? Number(p.pressure) : null,
          temperature: p.temperature != null ? Number(p.temperature) : null,
          stormScore: p.storm_score != null ? Number(p.storm_score) : null,
          turbulence: p.turbulence != null ? Number(p.turbulence) : null,
        });
      });

      map.on("mouseleave", fillLayerId, () => {
        map.getCanvas().style.cursor = "";
        props.onHoverFeature?.(null);
      });

      map.on("click", fillLayerId, (e) => {
        const f = e.features?.[0];
        const p: any = f?.properties ?? {};
        const explainId = p.explain_id ? String(p.explain_id) : p.id ? `explain:${String(p.id)}` : null;
        if (explainId) props.onExplain(explainId);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer(fillLayerId)) {
      map.setPaintProperty(fillLayerId, "fill-color", colorExpression(props.layer) as any);
    }

    const src = map.getSource(sourceId) as any;
    if (src?.setTiles) {
      src.setTiles([tileUrl]);
    } else {
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      map.addSource(sourceId, {
        type: "vector",
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 14,
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "fill-color": colorExpression(props.layer) as any,
          "fill-opacity": 0.7,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "line-color": "#374151",
          "line-width": 0.6,
          "line-opacity": 0.25,
        },
      });
    }

    map.triggerRepaint();
  }, [tileUrl, props.layer]);

  return <div ref={containerRef} style={{ height: 560, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }} />;
}
