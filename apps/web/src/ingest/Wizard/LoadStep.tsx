import React from 'react';

interface LoadStepProps {
  file: File | null;
}

export const LoadStep: React.FC<LoadStepProps> = ({ file }) => {
  const handleLoad = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    // In a real implementation, we would also send the mapping and policy config.
    formData.append('config', JSON.stringify({}));

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4012';

    await fetch(`${apiUrl}/ingest`, {
      method: 'POST',
      body: formData,
    });

    alert('Ingestion started!');
  };

  return (
    <div>
      <h2>Step 5: Load</h2>
      <p>Ready to load file: {file?.name}</p>
      <button onClick={handleLoad}>
        Start Ingestion
      </button>
    </div>
  );
};
