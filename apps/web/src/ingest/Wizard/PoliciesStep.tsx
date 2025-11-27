import React from 'react';

interface PoliciesStepProps {
  onNext: () => void;
}

export const PoliciesStep: React.FC<PoliciesStepProps> = ({ onNext }) => {
  return (
    <div>
      <h2>Step 3: Apply Policies</h2>
      {/* Placeholder for policy selection UI */}
      <button onClick={onNext}>
        Next
      </button>
    </div>
  );
};
