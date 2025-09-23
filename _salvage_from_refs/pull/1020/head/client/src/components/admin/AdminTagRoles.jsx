import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import { AdminAPI } from "../../services/api";

function AdminTagRoles() {
  const [tagRoles, setTagRoles] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    AdminAPI.tagRoles()
      .then(setTagRoles)
      .catch((e) => setError(e.message));
  }, []);

  const handleChange = (tag) => (e) => {
    const roles = e.target.value
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    setTagRoles({ ...tagRoles, [tag]: roles });
  };

  const handleSave = async () => {
    try {
      await AdminAPI.setTagRoles(tagRoles);
      alert("Tag roles updated");
    } catch (e) {
      alert("Failed to update tag roles: " + e.message);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tag Role Management
      </Typography>
      {error && (
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      )}
      {Object.entries(tagRoles).map(([tag, roles]) => (
        <Box key={tag} sx={{ mb: 2 }}>
          <TextField
            label={tag}
            fullWidth
            value={roles.join(", ")}
            onChange={handleChange(tag)}
          />
        </Box>
      ))}
      <Button variant="contained" onClick={handleSave} sx={{ mt: 2 }}>
        Save
      </Button>
    </Box>
  );
}

export default AdminTagRoles;
