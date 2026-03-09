import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { LayerKind } from "./LayerToggles";

type Props = {
  mapboxToken: string;
  narrativeId: string;
  tsBucket: string;
  layers: Record<LayerKind, boolean>;
  onExplain: (explainId: string) => void;
};

export function MapboxTerrainLayer(props: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mapboxgl.accessToken = props.mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-105.5, 39.0],
      zoom: 5,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Vector tile source (MVT)
      const tilesUrl =
        `/coggeo/terrain/tiles/{z}/{x}/{y}` +
        `?narrativeId=${encodeURIComponent(props.narrativeId)}` +
        `&tsBucket=${encodeURIComponent(props.tsBucket)}` +
        `&layer=storm&format=mvt`;

      map.addSource("coggeo-terrain", {
        type: "vector",
        tiles: [tilesUrl],
        minzoom: 0,
        maxzoom: 14,
      });

      // A single layer for demo; you can split per kind later.
      map.addLayer({
        id: "coggeo-storm",
        type: "fill",
        source: "coggeo-terrain",
        "source-layer": "terrain",
        paint: {
          "fill-opacity": 0.6,
          // color is default Mapbox style if unset; for demo keep simple
        },
      });

      // Hover tooltip
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

      map.on("mousemove", "coggeo-storm", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;

        const p: any = f.properties ?? {};
        const value = p.value ?? p.storm_score ?? "";
        popup
          .setLngLat((e.lngLat as any))
          .setHTML(`<div style="font-size:12px"><b>${p.layer ?? "storm"}</b><br/>value: ${value}<br/>h3: ${p.h3 ?? ""}</div>`)
          .addTo(map);
      });

      map.on("mouseleave", "coggeo-storm", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // Click → explain
      map.on("click", "coggeo-storm", (e) => {
        const f = e.features?.[0];
        const p: any = f?.properties ?? {};
        const explainId = p.explain_id ? String(p.explain_id) : (p.id ? `explain:${p.id}` : null);
        if (explainId) props.onExplain(explainId);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile URL when narrative/bucket changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src: any = map.getSource("coggeo-terrain");
    if (!src) return;

    const tilesUrl =
      `/coggeo/terrain/tiles/{z}/{x}/{y}` +
      `?narrativeId=${encodeURIComponent(props.narrativeId)}` +
      `&tsBucket=${encodeURIComponent(props.tsBucket)}` +
      `&layer=storm&format=mvt`;

    src.setTiles?.([tilesUrl]); // not always supported; safest is to recreate source in a real impl
    map.triggerRepaint();
  }, [props.narrativeId, props.tsBucket]);

  return <div ref={containerRef} style={{ height: 520, border: "1px solid #ddd", borderRadius: 8 }} />;
}
