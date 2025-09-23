import React, { useEffect, useState } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import { AdminAPI } from "../../services/api";

export default function OSINTFeedConfig() {
  const [config, setConfig] = useState({
    qualityWeight: 0.4,
    recencyWeight: 0.3,
    semanticDensityWeight: 0.3,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const cfg = await AdminAPI.osintFeedConfig();
        setConfig(cfg);
      } catch (e) {
        setMessage(e.message);
      }
    })();
  }, []);

  const handleChange = (key) => (e) => {
    setConfig({ ...config, [key]: parseFloat(e.target.value) });
  };

  const save = async () => {
    try {
      await AdminAPI.updateOsintFeedConfig(config);
      setMessage("Saved");
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Typography variant="h6" gutterBottom>
        OSINT Feed Ranking
      </Typography>
      <TextField
        label="Quality Weight"
        type="number"
        value={config.qualityWeight}
        inputProps={{ step: 0.1, min: 0, max: 1 }}
        onChange={handleChange("qualityWeight")}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Recency Weight"
        type="number"
        value={config.recencyWeight}
        inputProps={{ step: 0.1, min: 0, max: 1 }}
        onChange={handleChange("recencyWeight")}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Semantic Density Weight"
        type="number"
        value={config.semanticDensityWeight}
        inputProps={{ step: 0.1, min: 0, max: 1 }}
        onChange={handleChange("semanticDensityWeight")}
        fullWidth
        margin="normal"
      />
      <Button variant="contained" onClick={save} sx={{ mt: 2 }}>
        Save
      </Button>
      {message && (
        <Typography variant="caption" sx={{ ml: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
