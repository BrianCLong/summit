import React from "react";
import { Paper } from "@mui/material";
import EntityChangeLog from "../versioning/EntityChangeLog.jsx";

function ChangeLogPanel({ entityId }) {
  return (
    <Paper elevation={3} sx={{ p: 2, height: "100%" }}>
      <EntityChangeLog entityId={entityId} />
    </Paper>
  );
}

export default ChangeLogPanel;
