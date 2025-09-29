import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
} from "@mui/material";

/**
 * Simple data fusion tool that combines two JSON arrays and removes duplicates.
 * This placeholder demonstrates where more advanced AI/ML fusion logic can live.
 */
export default function DataFusionPanel() {
  const [sourceA, setSourceA] = useState("");
  const [sourceB, setSourceB] = useState("");
  const [result, setResult] = useState([]);
  const [error, setError] = useState("");

  const fuseData = () => {
    try {
      const dataA = JSON.parse(sourceA || "[]");
      const dataB = JSON.parse(sourceB || "[]");
      if (!Array.isArray(dataA) || !Array.isArray(dataB)) {
        throw new Error("Inputs must be JSON arrays");
      }
      const merged = [...dataA, ...dataB];
      const unique = Array.from(
        new Set(merged.map((item) => JSON.stringify(item))),
      ).map((item) => JSON.parse(item));
      setResult(unique);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Fusion Tools
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Source A (JSON Array)"
                fullWidth
                multiline
                minRows={6}
                value={sourceA}
                onChange={(e) => setSourceA(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Source B (JSON Array)"
                fullWidth
                multiline
                minRows={6}
                value={sourceB}
                onChange={(e) => setSourceB(e.target.value)}
              />
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={fuseData}>
            Fuse Data
          </Button>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>
      {result.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Fused Result
            </Typography>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
