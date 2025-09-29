import React from "react";
import Box from "@mui/material/Box";

export default function ExplainabilityOverlay({
  open = false,
  opacity = 0.4,
  children,
}) {
  if (!open) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        backgroundColor: `rgba(255, 215, 0, ${opacity})`,
        pointerEvents: "none",
      }}
    >
      {children}
    </Box>
  );
}
