import type { Meta, StoryObj } from '@storybook/react';
import { useReducer } from 'react';
import IngestWizard from '../IngestWizard';
import { ingestWizardReducer, initialWizardState } from '../state';

const meta: Meta<typeof IngestWizard> = {
  title: 'Ingest Wizard/Wizard',
  component: IngestWizard,
  parameters: {
    layout: 'fullscreen'
  }
};

export default meta;

type Story = StoryObj<typeof IngestWizard>;

export const Default: Story = {
  render: () => {
    const [state, dispatch] = useReducer(
      ingestWizardReducer,
      initialWizardState,
      () => ({
        ...initialWizardState,
        schemaMapping: {
          sourceSample: [
            { name: 'full_name', type: 'string' },
            { name: 'email', type: 'string' }
          ],
          targetSchema: [
            { name: 'person_name', type: 'string', required: true },
            { name: 'contact_email', type: 'string' }
          ],
          mappings: [],
          autoMappedFields: []
        }
      })
    );

    return (
      <div className="mx-auto max-w-4xl p-6">
        <IngestWizard state={state} dispatch={dispatch} onComplete={(result) => console.log('Complete', result)} />
      </div>
    );
  }
};
