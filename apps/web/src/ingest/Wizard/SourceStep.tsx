import React, { useState } from 'react';

interface SourceStepProps {
  onFileSelect: (file: File) => void;
}

export const SourceStep: React.FC<SourceStepProps> = ({ onFileSelect }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <h2>Step 1: Select Source</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={() => file && onFileSelect(file)} disabled={!file}>
        Next
      </button>
    </div>
  );
};
