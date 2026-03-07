import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Alert,
  AlertTitle,
  Grid,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const DemoWalkthrough = () => {
  const navigate = useNavigate();

  // Check if demo mode is enabled
  const isDemoMode =
    import.meta.env.VITE_DEMO_MODE === "1" || import.meta.env.VITE_DEMO_MODE === "true";

  // Redirect if not in demo mode
  if (!isDemoMode) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          <AlertTitle>Demo Mode Not Enabled</AlertTitle>
          This walkthrough is only available when <code>VITE_DEMO_MODE=1</code> is set.
          <br />
          <br />
          To enable demo mode, run: <code>make demo</code> or <code>VITE_DEMO_MODE=1 pnpm dev</code>
        </Alert>
      </Container>
    );
  }

  const walkthroughSteps = [
    {
      title: "Welcome to Summit Platform",
      description:
        "This guided tour will walk you through the key features of the Summit intelligence analysis platform.",
      action: "Click the button below to start exploring the Dashboard.",
      button: (
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
      ),
    },
    {
      title: "Explore the Graph",
      description:
        "The Graph Explorer shows relationships between entities in your intelligence data. You can zoom, pan, and click on nodes to see details.",
      action: "Try clicking on different nodes to see how entities are connected.",
      button: (
        <Button variant="contained" onClick={() => navigate("/graph")}>
          Open Graph Explorer
        </Button>
      ),
    },
    {
      title: "Use the AI Copilot",
      description:
        "The AI Copilot helps you analyze data and generate insights. Ask questions in natural language and get AI-powered responses.",
      action: "Try asking the copilot: 'What are the key relationships in this investigation?'",
      button: (
        <Button variant="contained" onClick={() => navigate("/copilot")}>
          Try AI Copilot
        </Button>
      ),
    },
    {
      title: "Review Investigations Timeline",
      description:
        "The Investigations Timeline shows a chronological view of events and activities related to your cases.",
      action: "Scroll through the timeline to see how events unfold.",
      button: (
        <Button variant="contained" onClick={() => navigate("/investigations")}>
          View Timeline
        </Button>
      ),
    },
    {
      title: "Threat Assessment",
      description:
        "The Threat Assessment Engine helps identify and prioritize potential threats based on your intelligence data.",
      action: "Review the threat scores and recommendations.",
      button: (
        <Button variant="contained" onClick={() => navigate("/threats")}>
          View Threats
        </Button>
      ),
    },
    {
      title: "Verify Demo Indicators",
      description: "Notice the 'DEMO MODE' indicators at the top-right and bottom of the screen.",
      action:
        "Look for the red 'DEMO MODE' ribbon and 'Demo data • Not production' watermark. These remind you that this is a demo environment with sample data.",
      button: null,
    },
    {
      title: "Stop/Reset the Demo",
      description: "When finished, you can stop the demo environment to free up resources.",
      action:
        "Run 'make demo-down' in your terminal to stop the demo, or 'make demo-down-cleanup' to also remove all demo data.",
      button: null,
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
          Summit Platform Demo Walkthrough
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom align="center" color="textSecondary">
          A guided tour for users new to the platform
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>What You'll Learn</AlertTitle>
          This walkthrough will guide you through the key features of the Summit Platform demo
          environment. Each step includes instructions and a link to the relevant section of the
          application.
        </Alert>
      </Paper>

      <Stepper orientation="vertical" activeStep={-1}>
        {walkthroughSteps.map((step) => (
          <Step key={step.title} active={true}>
            <StepLabel>
              <Typography variant="h6">{step.title}</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {step.description}
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>Action:</strong> {step.action}
              </Alert>
              {step.button && <Box sx={{ mb: 2 }}>{step.button}</Box>}
            </StepContent>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={2} sx={{ p: 3, mt: 4, bgcolor: "grey.50" }}>
        <Typography variant="h6" gutterBottom>
          Quick Reference
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>
              Key Features:
            </Typography>
            <Chip label="Graph Visualization" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip label="AI Analysis" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Timeline View" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Threat Assessment" variant="outlined" sx={{ mr: 1, mb: 1 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>
              Demo Safety:
            </Typography>
            <Chip
              label="Sample Data Only"
              color="warning"
              variant="outlined"
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip label="Not Production" color="error" variant="outlined" sx={{ mr: 1, mb: 1 }} />
            <Chip
              label="Safe to Explore"
              color="success"
              variant="outlined"
              sx={{ mr: 1, mb: 1 }}
            />
          </Grid>
        </Grid>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Remember: This is a demo environment with sample data. The 'DEMO MODE' indicators remind
          you that this is not a production system. All data is safe to explore and modify.
        </Typography>
      </Paper>
    </Container>
  );
};

export default DemoWalkthrough;
