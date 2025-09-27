import { useState } from 'react';

const steps = ['Tenant', 'SSO', 'Sample Data', 'Dashboards'];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  return (
    <div>
      <h2>Onboarding: {steps[step]}</h2>
      {step < steps.length - 1 && (
        <button onClick={() => setStep(step + 1)}>Next</button>
      )}
    </div>
  );
}
