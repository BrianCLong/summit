import React from 'react';

import { PreviewStep } from '@/features/ingestion/components/PreviewStep';

const SAMPLE_DATA = [
  { name: 'A. Rivera', role: 'Analyst', email: 'a.rivera@example.com' },
  { name: 'J. Chen', role: 'Investigator', email: 'j.chen@example.com' },
  { name: 'S. Patel', role: 'Operator', email: 's.patel@example.com' },
];

const SAMPLE_MAPPING = {
  fields: [
    { sourceField: 'name', targetField: 'entity_name' },
    { sourceField: 'role', targetField: 'entity_role' },
    { sourceField: 'email', targetField: 'contact_email', pii: true },
  ],
};

export function IngestionWizard() {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleImport = () => {
    setIsProcessing(true);
    window.setTimeout(() => setIsProcessing(false), 1200);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">Ingestion Wizard</h2>
        <p className="text-sm text-gray-500">
          Configure field mapping and validate policy constraints before
          ingestion.
        </p>
      </div>
      <PreviewStep
        data={SAMPLE_DATA}
        mapping={SAMPLE_MAPPING}
        onImport={handleImport}
        isProcessing={isProcessing}
      />
    </div>
  );
}
