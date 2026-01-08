// client/src/components/alerts/AlertRuleForm.tsx
import React, { useState } from "react";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  SelectChangeEvent,
} from "@mui/material";

// Placeholder for the AlertRule type
interface AlertRule {
  id?: string;
  name: string;
  metric: string;
  threshold: number;
  operator: string;
  durationSeconds: number;
  severity: "warning" | "critical" | "info";
  notificationChannelId: string;
}

interface AlertRuleFormProps {
  rule?: AlertRule;
  onSubmit: (rule: Omit<AlertRule, "id">) => void;
}

const AlertRuleForm: React.FC<AlertRuleFormProps> = ({ rule, onSubmit }) => {
  const [formData, setFormData] = useState<Omit<AlertRule, "id">>(
    rule || {
      name: "",
      metric: "",
      threshold: 0,
      operator: ">",
      durationSeconds: 60,
      severity: "warning",
      notificationChannelId: "",
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ "& .MuiTextField-root": { m: 1, width: "25ch" } }}
    >
      <Typography variant="h6">{rule ? "Edit" : "Create"} Alert Rule</Typography>
      <div>
        <TextField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <TextField
          label="Metric"
          name="metric"
          value={formData.metric}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <TextField
          label="Threshold"
          name="threshold"
          type="number"
          value={formData.threshold}
          onChange={handleChange}
          required
        />
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>Operator</InputLabel>
          <Select name="operator" value={formData.operator} onChange={handleSelectChange}>
            <MenuItem value=">">&gt;</MenuItem>
            <MenuItem value="<">&lt;</MenuItem>
            <MenuItem value="=">=</MenuItem>
          </Select>
        </FormControl>
      </div>
      <div>
        <TextField
          label="Duration (seconds)"
          name="durationSeconds"
          type="number"
          value={formData.durationSeconds}
          onChange={handleChange}
          required
        />
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>Severity</InputLabel>
          <Select name="severity" value={formData.severity} onChange={handleSelectChange}>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </Select>
        </FormControl>
      </div>
      <div>
        <TextField
          label="Notification Channel ID"
          name="notificationChannelId"
          value={formData.notificationChannelId}
          onChange={handleChange}
          required
        />
      </div>
      <Button type="submit" variant="contained" sx={{ m: 1 }}>
        {rule ? "Save Changes" : "Create Rule"}
      </Button>
    </Box>
  );
};

export default AlertRuleForm;
