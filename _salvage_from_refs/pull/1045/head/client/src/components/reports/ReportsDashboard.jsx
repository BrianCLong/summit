import React from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

// Placeholder report dashboard listing previously generated reports.
export default function ReportsDashboard() {
  const navigate = useNavigate();
  const sampleReports = [
    { id: 1, name: "Weekly Overview" },
    { id: 2, name: "Anomaly Summary" },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Generated Reports</Typography>
          <List>
            {sampleReports.map((r) => (
              <ListItem key={r.id} divider>
                <ListItemText primary={r.name} />
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            onClick={() => navigate("/reports/generator")}
          >
            Create New Report
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
