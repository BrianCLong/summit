import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Link,
  Alert,
  AlertTitle,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const DemoWalkthrough = () => {
  const navigate = useNavigate();

  // Check if demo mode is enabled
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === '1';

  // Redirect if not in demo mode
  if (!isDemoMode) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          <AlertTitle>Demo Mode Not Enabled</AlertTitle>
          This walkthrough is only available when <code>VITE_DEMO_MODE=1</code> is set.
          <br />
          <br />
          To enable: <code>VITE_DEMO_MODE=1 pnpm dev</code>
        </Alert>
      </Container>
    );
  }

  const steps = [
    {
      title: "Start the Demo Environment",
      description: "First, you'll need to start the complete demo environment with pre-seeded data.",
      action: "See the terminal where you ran 'make demo'",
      button: null
    },
    {
      title: "Open the UI",
      description: "Once services are running, the UI will be available at the specified URL.",
      action: "Navigate to http://localhost:3000 in your browser",
      button: (
        <Button 
          variant="contained" 
          onClick={() => window.open('http://localhost:3000', '_blank')}
        >
          Open UI
        </Button>
      )
    },
    {
      title: "Login with Demo Credentials",
      description: "Use the default demo credentials to access the platform.",
      action: "Username: demo@example.com, Password: demo123",
      button: (
        <Button 
          variant="outlined" 
          onClick={() => navigate('/login')}
        >
          Go to Login
        </Button>
      )
    },
    {
      title: "Explore the Dashboard",
      description: "The dashboard provides an overview of your investigations and key metrics.",
      action: "Click on 'Dashboard' in the main navigation",
      button: (
        <Button 
          variant="outlined" 
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </Button>
      )
    },
    {
      title: "View Seeded Entities",
      description: "The demo environment comes pre-populated with sample entities and relationships.",
      action: "Click on 'Investigations' to see the seeded data",
      button: (
        <Button 
          variant="outlined" 
          onClick={() => navigate('/investigations')}
        >
          View Investigations
        </Button>
      )
    },
    {
      title: "Try Graph Visualization",
      description: "Explore your data visually using the interactive graph explorer.",
      action: "Click on 'Graph Explorer' to visualize entities and relationships",
      button: (
        <Button 
          variant="outlined" 
          onClick={() => navigate('/graph')}
        >
          Graph Explorer
        </Button>
      )
    },
    {
      title: "Test AI Copilot",
      description: "Try the AI-powered copilot to ask questions about your data.",
      action: "Click on 'AI Copilot' to interact with the AI assistant",
      button: (
        <Button 
          variant="outlined" 
          onClick={() => navigate('/copilot')}
        >
          AI Copilot
        </Button>
      )
    },
    {
      title: "Verify Demo Indicators",
      description: "Notice the 'DEMO MODE' indicators at the top and bottom of the screen.",
      action: "Look for the red 'DEMO MODE' ribbon and 'Demo data • Not production' watermark",
      button: null
    },
    {
      title: "Stop/Reset the Demo",
      description: "When finished, you can stop the demo environment.",
      action: "Use 'make demo-down' to stop or 'make demo-down-cleanup' to remove all data",
      button: null
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
          🎮 Summit Platform Demo Walkthrough
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom align="center" color="textSecondary">
          A guided tour for non-technical users
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>What You'll Learn</AlertTitle>
          This walkthrough will guide you through the key features of the Summit Platform demo environment.
          Each step includes instructions and a link to the relevant section of the application.
        </Alert>
      </Paper>

      <Stepper orientation="vertical" activeStep={-1}>
        {steps.map((step, index) => (
          <Step key={index} completed={false}>
            <StepLabel>
              <Typography variant="h6" component="h3">
                {step.title}
              </Typography>
            </StepLabel>
            <StepContent>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body1" paragraph>
                    {step.description}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                    <strong>Action:</strong> {step.action}
                  </Typography>
                  {step.button && (
                    <Box sx={{ mt: 2 }}>
                      {step.button}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={2} sx={{ p: 3, mt: 4, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" component="h3" gutterBottom>
          💡 Tips for Non-Technical Users
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Chip label="Dashboard Overview" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Entity Exploration" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Relationship Mapping" variant="outlined" sx={{ mr: 1, mb: 1 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Chip label="AI Insights" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Graph Visualization" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Demo Safety" variant="outlined" sx={{ mr: 1, mb: 1 }} />
          </Grid>
        </Grid>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Remember: This is a demo environment with sample data. The 'DEMO MODE' indicators remind you that 
          this is not a production system. All data is safe to explore and modify.
        </Typography>
      </Paper>
    </Container>
  );
};

export default DemoWalkthrough;