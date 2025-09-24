import * as React from 'react';
import { IngestWizard } from '../features/ingest-wizard/IngestWizard';
import { useFlag } from '../hooks/useFlag';

const IngestWizardPage: React.FC = () => {
  const enabled = useFlag('features.ingestWizard');

  if (!enabled) {
    return (
      <section className="mx-auto max-w-3xl rounded border border-slate-200 bg-white p-6 text-center shadow">
        <h2 className="text-lg font-semibold text-slate-800">Ingest wizard unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">
          This feature is behind the <code className="rounded bg-slate-100 px-1.5 py-0.5">features.ingestWizard</code> flag. Contact
          an administrator to enable it.
        </p>
      </section>
    );
  }

  return <IngestWizard />;
};

export default IngestWizardPage;
