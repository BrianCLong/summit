import React from "react";
import { Box, Typography } from "@mui/material";

interface FacetsProps {
  facets: Record<string, string[]>;
}

const FacetsPanel: React.FC<FacetsProps> = ({ facets }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Facets
    </Typography>
    {Object.entries(facets).map(([key, values]) => (
      <Box key={key} mb={1}>
        <Typography variant="subtitle2">{key}</Typography>
        <Typography variant="body2">{values.join(", ")}</Typography>
      </Box>
    ))}
  </Box>
);

export default FacetsPanel;
