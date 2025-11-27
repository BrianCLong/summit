import React from 'react';

interface PreviewStepProps {
  file: File | null;
  onNext: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({ file, onNext }) => {
  return (
    <div>
      <h2>Step 4: Preview</h2>
      <p>Previewing data from: {file?.name}</p>
      {/* Placeholder for data preview UI */}
      <button onClick={onNext}>
        Next
      </button>
    </div>
  );
};
