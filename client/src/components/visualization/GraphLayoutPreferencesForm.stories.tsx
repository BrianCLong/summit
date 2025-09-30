import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import GraphLayoutPreferencesForm, {
  GraphLayoutPreference,
} from './GraphLayoutPreferencesForm';

const meta: Meta<typeof GraphLayoutPreferencesForm> = {
  title: 'Visualization/GraphLayoutPreferencesForm',
  component: GraphLayoutPreferencesForm,
};

export default meta;

type Story = StoryObj<typeof GraphLayoutPreferencesForm>;

const DEFAULT_PREF: GraphLayoutPreference = {
  layout: 'force',
  physicsEnabled: true,
  options: { orientation: 'vertical' },
};

export const Default: Story = {
  render: () => {
    const [preference, setPreference] = useState<GraphLayoutPreference>(DEFAULT_PREF);
    return (
      <div style={{ maxWidth: 720 }}>
        <GraphLayoutPreferencesForm
          preference={preference}
          onPreferenceChange={setPreference}
        />
      </div>
    );
  },
};

export const Hierarchical: Story = {
  render: () => {
    const [preference, setPreference] = useState<GraphLayoutPreference>({
      layout: 'hierarchical',
      physicsEnabled: true,
      options: { orientation: 'horizontal' },
    });
    return (
      <div style={{ maxWidth: 720 }}>
        <GraphLayoutPreferencesForm
          preference={preference}
          onPreferenceChange={setPreference}
        />
      </div>
    );
  },
};
