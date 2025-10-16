// conductor-ui/frontend/src/components/evidence/EvidenceExportButton.tsx
import React, { useState } from 'react';

const exportEvidenceBundle = async (runId: string) => {
  console.log(`Exporting evidence for run ${runId}...`);
  await new Promise((res) => setTimeout(res, 700));
  // In a real app, this would trigger a download of the JSON bundle.
  alert(`Evidence bundle for run ${runId} would be downloaded here.`);
};

export const EvidenceExportButton = ({ runId }: { runId: string }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);
    await exportEvidenceBundle(runId);
    setIsExporting(false);
  };

  return (
    <button onClick={handleClick} disabled={isExporting}>
      {isExporting ? 'Exporting...' : 'Export Evidence Bundle v0.2'}
    </button>
  );
};
