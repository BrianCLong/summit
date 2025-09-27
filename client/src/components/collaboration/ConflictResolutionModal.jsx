import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
} from "@mui/material";

export default function ConflictResolutionModal({
  open,
  local,
  server,
  onResolve,
  onCancel,
}) {
  const [selection, setSelection] = useState({});
  const fields = Object.keys(local);
  const handleChange = (field, value) => {
    setSelection((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmit = () => {
    const resolved = {};
    fields.forEach((f) => {
      resolved[f] = selection[f] === "server" ? server[f] : local[f];
    });
    onResolve(resolved);
  };
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Resolve Conflict</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Local</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Server</Typography>
          </Grid>
        </Grid>
        {fields.map((field) => (
          <Grid
            container
            spacing={2}
            alignItems="center"
            key={field}
            sx={{ mb: 1 }}
          >
            <Grid item xs={5}>
              <Typography variant="body2">
                {String(local[field] ?? "")}
              </Typography>
            </Grid>
            <Grid item xs={2}>
              <RadioGroup
                row
                value={selection[field] || "local"}
                onChange={(e) => handleChange(field, e.target.value)}
              >
                <FormControlLabel
                  value="local"
                  control={<Radio size="small" />}
                  label=""
                />
                <FormControlLabel
                  value="server"
                  control={<Radio size="small" />}
                  label=""
                />
              </RadioGroup>
            </Grid>
            <Grid item xs={5}>
              <Typography variant="body2">
                {String(server[field] ?? "")}
              </Typography>
            </Grid>
          </Grid>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
