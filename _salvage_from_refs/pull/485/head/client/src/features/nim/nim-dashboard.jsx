import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import NIMGraph from "./nim-graph";
import RiskHeatmap from "./risk-heatmap";

export default function NIMDashboard() {
  const [graph, setGraph] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/nim");
        const json = await res.json();
        setGraph(json.graph);
      } catch (e) {
        console.error("Failed to load NIM data", e);
      }
    };
    loadData();
  }, []);

  if (!graph) {
    return <Typography>Loading...</Typography>;
  }

  const points = graph.nodes
    .filter((n) => n.lat && n.lon)
    .map((n) => ({ lat: n.lat, lon: n.lon, risk: n.riskScore }));

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      <Box sx={{ flex: 2 }}>
        <NIMGraph data={graph} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <RiskHeatmap points={points} />
      </Box>
    </Box>
  );
}
