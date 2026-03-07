import React from "react";
import {
  Box,
  Button,
  LinearProgress,
  MobileStepper,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ReplayIcon from "@mui/icons-material/Replay";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useDesignSystemTelemetry } from "../DesignSystemProvider";

export type WizardStep = {
  id: string;
  title: string;
  description?: string;
  render: () => React.ReactNode;
  isComplete?: () => boolean;
  isOptional?: boolean;
};

export type OnboardingWizardProps = {
  flowId: string;
  steps: WizardStep[];
  onComplete?: () => void;
  onReset?: () => void;
};

const storageKey = (flowId: string) => `onboarding-wizard:${flowId}`;

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  flowId,
  steps,
  onComplete,
  onReset,
}) => {
  const telemetry = useDesignSystemTelemetry();
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [activeStep, setActiveStep] = React.useState<number>(() => {
    const saved = localStorage.getItem(storageKey(flowId));
    const parsed = saved ? Number(saved) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });

  React.useEffect(() => {
    telemetry.record("OnboardingWizard", "1.0.0", { flowId, steps: steps.map((s) => s.id) });
  }, [flowId, steps, telemetry]);

  React.useEffect(() => {
    localStorage.setItem(storageKey(flowId), String(activeStep));
  }, [flowId, activeStep]);

  const handleNext = () => {
    const next = Math.min(activeStep + 1, steps.length - 1);
    setActiveStep(next);
    if (next === steps.length - 1 && onComplete) {
      onComplete();
    }
  };

  const handleBack = () => setActiveStep(Math.max(activeStep - 1, 0));

  const handleReset = () => {
    localStorage.removeItem(storageKey(flowId));
    setActiveStep(0);
    onReset?.();
    telemetry.record("OnboardingWizardReset", "1.0.0", { flowId });
  };

  const currentStep = steps[activeStep];
  if (!currentStep) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          No onboarding steps configured
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Provide at least one step to initialize the wizard.
        </Typography>
      </Paper>
    );
  }
  const completed = currentStep?.isComplete?.() ?? false;

  return (
    <Paper variant="outlined" sx={{ p: 3, position: "relative", overflow: "hidden" }}>
      {prefersReducedMotion ? null : (
        <LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100} />
      )}
      <Stack spacing={1} mb={2} mt={prefersReducedMotion ? 0 : 2}>
        <Typography variant="overline" color="text.secondary">
          Step {activeStep + 1} of {steps.length}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5" component="h2">
            {currentStep.title}
          </Typography>
          {completed && <CheckCircleOutlineIcon color="success" aria-label="Step completed" />}
        </Stack>
        {currentStep.description && (
          <Typography variant="body2" color="text.secondary">
            {currentStep.description}
          </Typography>
        )}
      </Stack>
      <Box role="group" aria-label={`Step ${activeStep + 1} content`}>
        {currentStep.render()}
      </Box>
      <MobileStepper
        variant="dots"
        steps={steps.length}
        position="bottom"
        activeStep={activeStep}
        sx={{ background: "transparent", pt: 2 }}
        nextButton={
          <Button
            size="small"
            onClick={handleNext}
            disabled={!completed && !currentStep.isOptional}
            endIcon={<ArrowForwardIcon />}
            aria-label="Next step"
          >
            {activeStep === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        }
        backButton={
          <Button
            size="small"
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<ArrowBackIcon />}
            aria-label="Previous step"
          >
            Back
          </Button>
        }
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} spacing={2}>
        <Button
          variant="text"
          color="inherit"
          startIcon={<ReplayIcon />}
          onClick={handleReset}
          aria-label="Reset wizard"
        >
          Reset progress
        </Button>
        <Typography variant="caption" color="text.secondary">
          Honors reduced motion: {prefersReducedMotion ? "on" : "off"} | Theme: {theme.palette.mode}
        </Typography>
      </Stack>
    </Paper>
  );
};
