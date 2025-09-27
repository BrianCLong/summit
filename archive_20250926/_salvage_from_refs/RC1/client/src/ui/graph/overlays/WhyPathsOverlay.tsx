import React, { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import type { FC } from "react";

export interface WhyPath {
  from: string;
  to: string;
  relId: string;
  type?: string;
  text?: string;
  supportScore?: number;
  score_breakdown?: {
    length: number;
    edgeType: number;
    centrality: number;
  };
}

interface Props {
  cy?: any; // cytoscape instance
  paths: WhyPath[];
  open: boolean;
}

/**
 * WhyPathsOverlay highlights edges returned from a graphRAG query.
 * It keeps render times in a histogram and warns if p95 > 50ms.
 */
const WhyPathsOverlay: FC<Props> = ({ cy, paths, open }) => {
  const times = useRef<number[]>([]);

  useEffect(() => {
    if (!cy || !open) return;
    const start = performance.now();

    const limited = paths.slice(0, 200); // cap to 200 elements
    const ids = limited.map((p) => p.relId);

    cy.batch(() => {
      cy.elements(".why-path").removeClass("why-path");
      ids.forEach((id) => {
        const ele = cy.$(`edge[id = "${id}"]`);
        if (ele.nonempty()) {
          ele.addClass("why-path");
          if (paths.find((p) => p.relId === id)?.text) {
            ele.qtip?.({
              content: paths.find((p) => p.relId === id)?.text,
              show: { solo: true },
              hide: { event: "mouseout unfocus" },
            });
          }
        }
      });
    });

    const ms = performance.now() - start;
    const telemetry =
      (window as any).__telemetry ||
      ((window as any).__telemetry = { ui_overlay_render_ms: [] });
    telemetry.ui_overlay_render_ms.push(ms);
    times.current.push(ms);
    const sorted = [...times.current].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    if (p95 > 50) console.warn("ui_overlay_render_ms p95>50ms");
  }, [cy, paths, open]);

  if (!open) return null;

  return (
    <Box
      role="presentation"
      sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
};

export default WhyPathsOverlay;
