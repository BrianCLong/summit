import React from 'react';

export default function ExportReportDialog({ onExport }: { onExport: () => void }) {
  return (
    <div>
      <button onClick={onExport}>Export Report (PII Off)</button>
    </div>
  );
}
