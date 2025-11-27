import React from 'react';

interface MapStepProps {
  file: File | null;
  onNext: () => void;
}

export const MapStep: React.FC<MapStepProps> = ({ file, onNext }) => {
  return (
    <div>
      <h2>Step 2: Map Fields</h2>
      <p>Mapping fields for file: {file?.name}</p>
      {/* Placeholder for mapping UI */}
      <button onClick={onNext}>
        Next
      </button>
    </div>
  );
};
