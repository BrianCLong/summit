import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Card,
  CardContent,
  IconButton,
  Fab,
  Backdrop,
  Fade,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  LinearProgress,
  Alert,
  Divider,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Close,
  NavigateNext,
  NavigateBefore,
  Dashboard,
  AccountTree,
  Psychology,
  Search,
  Settings,
  Group,
  Help,
  CheckCircle,
  PlayArrow,
  Pause,
  Refresh,
  Lightbulb,
  Star,
  School,
  Timeline,
  Analytics,
  Security,
  Keyboard,
  Mouse,
  TouchApp,
  Visibility,
  VolumeUp,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';

const onboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to IntelGraph',
    description:
      'Your intelligent platform for network analysis and investigation.',
    content:
      'IntelGraph is a powerful platform that combines advanced graph visualization, AI-powered insights, and collaborative tools to help you analyze complex networks and conduct thorough investigations.',
    icon: <Star />,
    actions: ['Take Tour', 'Skip Tour'],
    estimatedTime: '10 minutes',
    keyFeatures: [
      'Interactive graph visualization',
      'AI-powered analysis and insights',
      'Real-time collaboration',
      'Natural language queries',
      'Advanced analytics dashboard',
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation & Layout',
    description: 'Learn how to navigate the platform efficiently.',
    content:
      'The IntelGraph interface is designed for efficiency. Use the sidebar to access different sections, the top bar for quick actions, and customize your workspace.',
    icon: <Dashboard />,
    highlightSelectors: ['.MuiDrawer-root', '.MuiAppBar-root'],
    interactiveElements: [
      {
        selector: '[data-tour="sidebar"]',
        title: 'Sidebar Navigation',
        description:
          'Access different sections: Dashboard, Graph Explorer, Analytics, and more.',
      },
      {
        selector: '[data-tour="user-menu"]',
        title: 'User Menu',
        description: 'Access your profile, settings, and help resources.',
      },
    ],
    tips: [
      'Use Ctrl+/ to open the command palette',
      'Click the logo to return to dashboard',
      'Toggle sidebar with the menu button',
    ],
  },
  {
    id: 'graph-explorer',
    title: 'Graph Explorer',
    description: 'Explore and interact with network visualizations.',
    content:
      'The Graph Explorer is the heart of IntelGraph. Visualize complex networks, apply different layouts, and discover patterns in your data.',
    icon: <AccountTree />,
    highlightSelectors: ['[data-tour="graph-container"]'],
    interactiveElements: [
      {
        selector: '[data-tour="graph-controls"]',
        title: 'Graph Controls',
        description:
          'Zoom, pan, center, and apply different layouts to your graph.',
      },
      {
        selector: '[data-tour="node-panel"]',
        title: 'Entity Details',
        description:
          'Click any node to view detailed information and connected entities.',
      },
    ],
    keyFeatures: [
      'Drag and drop to reposition nodes',
      'Right-click for context menus',
      'Multiple layout algorithms',
      'Search and filter capabilities',
    ],
  },
  {
    id: 'ai-features',
    title: 'AI-Powered Insights',
    description: 'Leverage artificial intelligence for advanced analysis.',
    content:
      'IntelGraph uses AI to provide intelligent insights, detect anomalies, recommend connections, and answer natural language queries.',
    icon: <Psychology />,
    highlightSelectors: ['[data-tour="ai-panel"]'],
    features: [
      {
        name: 'Natural Language Queries',
        description:
          'Ask questions in plain English like "Show all organizations in New York"',
        icon: <Search />,
      },
      {
        name: 'Anomaly Detection',
        description:
          'Automatically identify unusual patterns and relationships',
        icon: <Security />,
      },
      {
        name: 'Smart Recommendations',
        description:
          'Get suggestions for related entities and potential connections',
        icon: <Lightbulb />,
      },
      {
        name: 'Predictive Analytics',
        description: 'Forecast trends and predict future network evolution',
        icon: <Timeline />,
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Real-time Collaboration',
    description: 'Work together with your team in real-time.',
    content:
      'IntelGraph enables seamless collaboration with features like shared cursors, live comments, user presence indicators, and synchronized views.',
    icon: <Group />,
    features: [
      'Live cursor tracking',
      'Real-time comments and annotations',
      'User presence indicators',
      'Shared investigation workspaces',
      'Version history and change tracking',
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Monitor performance and track insights.',
    content:
      'The analytics dashboard provides comprehensive metrics about your investigations, network statistics, and system performance.',
    icon: <Analytics />,
    highlightSelectors: ['[data-tour="dashboard"]'],
    metrics: [
      'Network structure statistics',
      'Investigation progress tracking',
      'AI insight summaries',
      'User activity metrics',
      'Performance indicators',
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Master keyboard shortcuts for efficiency.',
    content: 'Speed up your workflow with these essential keyboard shortcuts.',
    icon: <Keyboard />,
    shortcuts: [
      { keys: 'Ctrl + /', action: 'Open command palette' },
      { keys: 'Ctrl + K', action: 'Quick search' },
      { keys: 'Ctrl + N', action: 'New investigation' },
      { keys: 'Ctrl + S', action: 'Save current view' },
      { keys: 'Escape', action: 'Clear selection' },
      { keys: 'Space', action: 'Center graph' },
      { keys: 'F', action: 'Fit graph to screen' },
      { keys: '?', action: 'Show help' },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility Features',
    description: 'Learn about accessibility and customization options.',
    content:
      'IntelGraph is designed to be accessible to all users with various accessibility features and customization options.',
    icon: <Visibility />,
    features: [
      'Screen reader support',
      'High contrast mode',
      'Keyboard navigation',
      'Text size adjustment',
      'Reduced motion option',
      'Voice commands (experimental)',
    ],
  },
  {
    id: 'completion',
    title: "You're Ready!",
    description: 'Start exploring and analyzing with IntelGraph.',
    content:
      "Congratulations! You've completed the onboarding tour. You're now ready to start using IntelGraph for your investigations and analysis.",
    icon: <CheckCircle />,
    actions: ['Start Using IntelGraph', 'Retake Tour'],
    resources: [
      { title: 'Documentation', url: '/docs', icon: <Help /> },
      { title: 'Video Tutorials', url: '/tutorials', icon: <PlayArrow /> },
      { title: 'Community Forum', url: '/community', icon: <Group /> },
      { title: 'Support Center', url: '/support', icon: <Help /> },
    ],
  },
];

function OnboardingTour({ open, onClose, autoStart = false }) {
  const [activeStep, setActiveStep] = useState(0);
  const [tourProgress, setTourProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [showTips, setShowTips] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [userPreferences, setUserPreferences] = useState({
    skipAnimations: false,
    highlightElements: true,
    showProgress: true,
  });

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying && open) {
      intervalRef.current = setInterval(() => {
        setActiveStep((prev) => {
          if (prev < onboardingSteps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 5000); // Auto-advance every 5 seconds
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, open]);

  useEffect(() => {
    setTourProgress(((activeStep + 1) / onboardingSteps.length) * 100);
  }, [activeStep]);

  useEffect(() => {
    // Highlight elements when step changes
    if (userPreferences.highlightElements && open) {
      const currentStep = onboardingSteps[activeStep];
      if (currentStep.highlightSelectors) {
        highlightElements(currentStep.highlightSelectors);
      }
    }

    return () => removeHighlights();
  }, [activeStep, open, userPreferences.highlightElements]);

  const highlightElements = (selectors) => {
    removeHighlights();
    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        element.classList.add('tour-highlight');
        element.style.outline = '3px solid #1976d2';
        element.style.outlineOffset = '2px';
        element.style.borderRadius = '4px';
        element.style.transition = 'all 0.3s ease';
      });
    });
  };

  const removeHighlights = () => {
    const highlighted = document.querySelectorAll('.tour-highlight');
    highlighted.forEach((element) => {
      element.classList.remove('tour-highlight');
      element.style.outline = '';
      element.style.outlineOffset = '';
    });
  };

  const handleNext = () => {
    if (activeStep < onboardingSteps.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, activeStep]));
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (stepIndex) => {
    setActiveStep(stepIndex);
  };

  const handleComplete = () => {
    setCompletedSteps((prev) => new Set([...prev, activeStep]));
    // Save completion status
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_date', new Date().toISOString());

    // Dispatch completion event
    // dispatch(completeOnboarding());

    removeHighlights();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_skipped', 'true');
    removeHighlights();
    onClose();
  };

  const currentStep = onboardingSteps[activeStep];

  const StepContentRenderer = ({ step }) => {
    switch (step.id) {
      case 'welcome':
        return (
          <Box>
            <Typography variant="body1" paragraph>
              {step.content}
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Key Features:
            </Typography>
            <List>
              {step.keyFeatures.map((feature, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>
            <Alert severity="info" sx={{ mt: 2 }}>
              Estimated time: {step.estimatedTime}
            </Alert>
          </Box>
        );

      case 'ai-features':
        return (
          <Box>
            <Typography variant="body1" paragraph>
              {step.content}
            </Typography>
            <Box sx={{ mt: 2 }}>
              {step.features.map((feature, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h6">{feature.name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        );

      case 'keyboard-shortcuts':
        return (
          <Box>
            <Typography variant="body1" paragraph>
              {step.content}
            </Typography>
            <List>
              {step.shortcuts.map((shortcut, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Chip label={shortcut.keys} variant="outlined" />
                  </ListItemIcon>
                  <ListItemText primary={shortcut.action} />
                </ListItem>
              ))}
            </List>
          </Box>
        );

      case 'completion':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{
                bgcolor: 'success.main',
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
              }}
            >
              <CheckCircle sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="body1" paragraph>
              {step.content}
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Additional Resources:
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
              }}
            >
              {step.resources.map((resource, index) => (
                <Chip
                  key={index}
                  icon={resource.icon}
                  label={resource.title}
                  clickable
                  variant="outlined"
                  onClick={() => window.open(resource.url, '_blank')}
                />
              ))}
            </Box>
          </Box>
        );

      default:
        return (
          <Box>
            <Typography variant="body1" paragraph>
              {step.content}
            </Typography>
            {step.features && (
              <List>
                {step.features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            )}
            {step.tips && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  💡 Pro Tips:
                </Typography>
                <List dense>
                  {step.tips.map((tip, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Lightbulb color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={tip} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        );
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: 600,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ position: 'relative', height: '100%' }}>
          {/* Progress Bar */}
          {userPreferences.showProgress && (
            <LinearProgress
              variant="determinate"
              value={tourProgress}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1,
              }}
            />
          )}

          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {currentStep.icon}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {currentStep.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Step {activeStep + 1} of {onboardingSteps.length}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip
                title={isPlaying ? 'Pause auto-advance' : 'Start auto-advance'}
              >
                <IconButton
                  onClick={() => setIsPlaying(!isPlaying)}
                  color="primary"
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
              </Tooltip>
              <IconButton onClick={onClose}>
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Stepper */}
          <Box
            sx={{
              display: 'flex',
              overflow: 'auto',
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            {onboardingSteps.map((step, index) => (
              <Box
                key={step.id}
                sx={{
                  minWidth: 120,
                  textAlign: 'center',
                  p: 1,
                  cursor: 'pointer',
                  borderRadius: 1,
                  bgcolor:
                    index === activeStep ? 'primary.main' : 'transparent',
                  color:
                    index === activeStep
                      ? 'primary.contrastText'
                      : 'text.primary',
                  '&:hover': {
                    bgcolor:
                      index === activeStep ? 'primary.dark' : 'action.hover',
                  },
                }}
                onClick={() => handleStepClick(index)}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mx: 'auto',
                    mb: 0.5,
                    bgcolor: completedSteps.has(index)
                      ? 'success.main'
                      : index === activeStep
                        ? 'primary.contrastText'
                        : 'grey.300',
                    color: completedSteps.has(index)
                      ? 'success.contrastText'
                      : index === activeStep
                        ? 'primary.main'
                        : 'grey.600',
                  }}
                >
                  {completedSteps.has(index) ? <CheckCircle /> : step.icon}
                </Avatar>
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  {step.title}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Content */}
          <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {currentStep.description}
            </Typography>
            <StepContentRenderer step={currentStep} />
          </DialogContent>

          {/* Actions */}
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!userPreferences.highlightElements}
                  onChange={(e) =>
                    setUserPreferences((prev) => ({
                      ...prev,
                      highlightElements: !e.target.checked,
                    }))
                  }
                />
              }
              label="Disable highlights"
              sx={{ mr: 'auto' }}
            />

            <Button onClick={handleSkip} color="inherit">
              Skip Tour
            </Button>

            {activeStep > 0 && (
              <Button
                onClick={handleBack}
                startIcon={<NavigateBefore />}
                variant="outlined"
              >
                Back
              </Button>
            )}

            {activeStep < onboardingSteps.length - 1 ? (
              <Button
                onClick={handleNext}
                endIcon={<NavigateNext />}
                variant="contained"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                variant="contained"
                color="success"
                endIcon={<CheckCircle />}
              >
                Complete Tour
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>

      {/* Floating Help Button */}
      {!open && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1000,
          }}
          onClick={() => {
            // Reopen onboarding
            setActiveStep(0);
            // onOpen would be called from parent
          }}
        >
          <Help />
        </Fab>
      )}
    </>
  );
}

export default OnboardingTour;
