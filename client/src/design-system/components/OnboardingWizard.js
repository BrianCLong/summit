"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingWizard = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const styles_1 = require("@mui/material/styles");
const Replay_1 = __importDefault(require("@mui/icons-material/Replay"));
const ArrowBack_1 = __importDefault(require("@mui/icons-material/ArrowBack"));
const ArrowForward_1 = __importDefault(require("@mui/icons-material/ArrowForward"));
const CheckCircleOutline_1 = __importDefault(require("@mui/icons-material/CheckCircleOutline"));
const DesignSystemProvider_1 = require("../DesignSystemProvider");
const storageKey = (flowId) => `onboarding-wizard:${flowId}`;
const OnboardingWizard = ({ flowId, steps, onComplete, onReset }) => {
    const telemetry = (0, DesignSystemProvider_1.useDesignSystemTelemetry)();
    const theme = (0, styles_1.useTheme)();
    const prefersReducedMotion = (0, material_1.useMediaQuery)('(prefers-reduced-motion: reduce)');
    const [activeStep, setActiveStep] = react_1.default.useState(() => {
        const saved = localStorage.getItem(storageKey(flowId));
        const parsed = saved ? Number(saved) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
    });
    react_1.default.useEffect(() => {
        telemetry.record('OnboardingWizard', '1.0.0', { flowId, steps: steps.map((s) => s.id) });
    }, [flowId, steps, telemetry]);
    react_1.default.useEffect(() => {
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
        telemetry.record('OnboardingWizardReset', '1.0.0', { flowId });
    };
    const currentStep = steps[activeStep];
    if (!currentStep) {
        return (<material_1.Paper variant="outlined" sx={{ p: 3 }}>
        <material_1.Typography variant="h6" gutterBottom>
          No onboarding steps configured
        </material_1.Typography>
        <material_1.Typography variant="body2" color="text.secondary">
          Provide at least one step to initialize the wizard.
        </material_1.Typography>
      </material_1.Paper>);
    }
    const completed = currentStep?.isComplete?.() ?? false;
    return (<material_1.Paper variant="outlined" sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
      {prefersReducedMotion ? null : <material_1.LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100}/>}
      <material_1.Stack spacing={1} mb={2} mt={prefersReducedMotion ? 0 : 2}>
        <material_1.Typography variant="overline" color="text.secondary">
          Step {activeStep + 1} of {steps.length}
        </material_1.Typography>
        <material_1.Stack direction="row" spacing={1} alignItems="center">
          <material_1.Typography variant="h5" component="h2">
            {currentStep.title}
          </material_1.Typography>
          {completed && <CheckCircleOutline_1.default color="success" aria-label="Step completed"/>}
        </material_1.Stack>
        {currentStep.description && (<material_1.Typography variant="body2" color="text.secondary">
            {currentStep.description}
          </material_1.Typography>)}
      </material_1.Stack>
      <material_1.Box role="group" aria-label={`Step ${activeStep + 1} content`}>
        {currentStep.render()}
      </material_1.Box>
      <material_1.MobileStepper variant="dots" steps={steps.length} position="bottom" activeStep={activeStep} sx={{ background: 'transparent', pt: 2 }} nextButton={<material_1.Button size="small" onClick={handleNext} disabled={!completed && !currentStep.isOptional} endIcon={<ArrowForward_1.default />} aria-label="Next step">
            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
          </material_1.Button>} backButton={<material_1.Button size="small" onClick={handleBack} disabled={activeStep === 0} startIcon={<ArrowBack_1.default />} aria-label="Previous step">
            Back
          </material_1.Button>}/>
      <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} spacing={2}>
        <material_1.Button variant="text" color="inherit" startIcon={<Replay_1.default />} onClick={handleReset} aria-label="Reset wizard">
          Reset progress
        </material_1.Button>
        <material_1.Typography variant="caption" color="text.secondary">
          Honors reduced motion: {prefersReducedMotion ? 'on' : 'off'} | Theme: {theme.palette.mode}
        </material_1.Typography>
      </material_1.Stack>
    </material_1.Paper>);
};
exports.OnboardingWizard = OnboardingWizard;
