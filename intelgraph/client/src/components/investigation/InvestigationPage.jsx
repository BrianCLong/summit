import React, { useState } from 'react';
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
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility,
  Edit,
  AccountTree,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function InvestigationPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  const investigations = [
    {
      id: 1,
      title: 'Financial Network Analysis',
      description:
        'Investigating suspicious financial transactions across multiple entities',
      status: 'active',
      priority: 'high',
      entities: 45,
      relationships: 67,
      created: '2024-01-15',
      updated: '2 hours ago',
    },
    {
      id: 2,
      title: 'Supply Chain Investigation',
      description:
        'Analyzing supply chain connections and potential fraud indicators',
      status: 'pending',
      priority: 'medium',
      entities: 78,
      relationships: 123,
      created: '2024-01-12',
      updated: '5 hours ago',
    },
    {
      id: 3,
      title: 'Communication Pattern Analysis',
      description: 'Mapping communication networks and identifying key players',
      status: 'completed',
      priority: 'low',
      entities: 123,
      relationships: 234,
      created: '2024-01-08',
      updated: '1 day ago',
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleCreateInvestigation = () => {
    console.log('Creating investigation:', newInvestigation);
    setOpenDialog(false);
    setNewInvestigation({ title: '', description: '', priority: 'medium' });
  };

  const filteredInvestigations = investigations.filter(
    (investigation) =>
      investigation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investigation.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
        onChange={(event) => setSearchTerm(event.target.value)}
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
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
                    {investigation.title}
                  </Typography>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
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
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Entities: {investigation.entities}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Relationships: {investigation.relationships}
                  </Typography>
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Created: {investigation.created}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 2 }}
                >
                  Updated: {investigation.updated}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => navigate(`/graph/${investigation.id}`)}
                    size="small"
                  >
                    View Graph
                  </Button>
                  <Button variant="text" startIcon={<Edit />} size="small">
                    Edit
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<AccountTree />}
                    size="small"
                  >
                    Assign
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Investigation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={newInvestigation.title}
            onChange={(event) =>
              setNewInvestigation({
                ...newInvestigation,
                title: event.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            minRows={3}
            value={newInvestigation.description}
            onChange={(event) =>
              setNewInvestigation({
                ...newInvestigation,
                description: event.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Priority"
            value={newInvestigation.priority}
            onChange={(event) =>
              setNewInvestigation({
                ...newInvestigation,
                priority: event.target.value,
              })
            }
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateInvestigation} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvestigationPage;
