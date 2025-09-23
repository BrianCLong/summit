import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  AccountTree,
  Schema,
} from "@mui/icons-material";
import Outbox from "@mui/icons-material/Outbox";
import { ExportCaseDialog } from '../../features/export/ExportCaseDialog.js';
import { useNavigate } from "react-router-dom";
import CustomSchemaModal from "./CustomSchemaModal";
import InvestigationTimeline from "../timeline/InvestigationTimeline";
import FacetsPanel from "./FacetsPanel";
import SavedViewsPanel from "./SavedViewsPanel";
import WhyPathExplainer from "./WhyPathExplainer";

function InvestigationPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportInvestigationId, setExportInvestigationId] = useState(null);
  const [currentInvestigation, setCurrentInvestigation] = useState(null);
  const [newInvestigation, setNewInvestigation] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  const investigations = [
    {
      id: 1,
      title: "Financial Network Analysis",
      description:
        "Investigating suspicious financial transactions across multiple entities",
      status: "active",
      priority: "high",
      entities: 45,
      relationships: 67,
      created: "2024-01-15",
      updated: "2 hours ago",
    },
    {
      id: 2,
      title: "Supply Chain Investigation",
      description:
        "Analyzing supply chain connections and potential fraud indicators",
      status: "pending",
      priority: "medium",
      entities: 78,
      relationships: 123,
      created: "2024-01-12",
      updated: "5 hours ago",
    },
    {
      id: 3,
      title: "Communication Pattern Analysis",
      description: "Mapping communication networks and identifying key players",
      status: "completed",
      priority: "low",
      entities: 123,
      relationships: 234,
      created: "2024-01-08",
      updated: "1 day ago",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "completed":
        return "info";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const handleCreateInvestigation = () => {
    console.log("Creating investigation:", newInvestigation);
    setOpenDialog(false);
    setNewInvestigation({ title: "", description: "", priority: "medium" });
  };

  const filteredInvestigations = investigations.filter(
    (inv) =>
      inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          Investigations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="large"
        >
          New Investigation
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search investigations..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      <Grid container spacing={3}>
        {filteredInvestigations.map((investigation) => (
          <Grid item xs={12} md={6} lg={4} key={investigation.id}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
                    {investigation.title}
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Chip
                      label={investigation.status}
                      color={getStatusColor(investigation.status)}
                      size="small"
                    />
                    <Chip
                      label={investigation.priority}
                      color={getPriorityColor(investigation.priority)}
                      size="small"
                    />
                  </Box>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {investigation.description}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {investigation.entities} entities
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {investigation.relationships} relationships
                  </Typography>
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 2, display: "block" }}
                >
                  Updated {investigation.updated}
                </Typography>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<AccountTree />}
                    onClick={() => navigate(`/graph/${investigation.id}`)}
                  >
                    View Graph
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Schema />}
                    variant="outlined"
                    onClick={() => {
                      setCurrentInvestigation(investigation);
                      setSchemaDialogOpen(true);
                    }}
                  >
                    Schema
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Outbox />}
                    variant="outlined"
                    onClick={() => {
                      setExportInvestigationId(investigation.id);
                      setExportDialogOpen(true);
                    }}
                  >
                    Export Bundle
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    variant="outlined"
                    onClick={() => {
                      setExportInvestigationId(investigation.id);
                      setExportDialogOpen(true);
                    }}
                  >
                    Export Bundle
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={6}>
        <InvestigationTimeline events={[]} />
      </Box>
      <Grid container spacing={2} mt={2}>
        <Grid item xs={12} md={4}>
          <FacetsPanel facets={{}} />
        </Grid>
        <Grid item xs={12} md={4}>
          <SavedViewsPanel views={[]} />
        </Grid>
        <Grid item xs={12} md={4}>
          <WhyPathExplainer paths={[]} />
        </Grid>
      </Grid>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Investigation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Investigation Title"
            fullWidth
            variant="outlined"
            value={newInvestigation.title}
            onChange={(e) =>
              setNewInvestigation({
                ...newInvestigation,
                title: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newInvestigation.description}
            onChange={(e) =>
              setNewInvestigation({
                ...newInvestigation,
                description: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Priority"
            fullWidth
            variant="outlined"
            value={newInvestigation.priority}
            onChange={(e) =>
              setNewInvestigation({
                ...newInvestigation,
                priority: e.target.value,
              })
            }
            SelectProps={{
              native: true,
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateInvestigation} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
      {currentInvestigation && (
        <CustomSchemaModal
          open={schemaDialogOpen}
          onClose={() => setSchemaDialogOpen(false)}
          investigationId={currentInvestigation.id}
        />
      )}

      {exportInvestigationId && (
        <ExportCaseDialog
          caseId={exportInvestigationId}
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
        />
      )}
    </Box>
  );
}

export default InvestigationPage;
