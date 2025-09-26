import React, { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MockedProvider } from '@apollo/client/testing';
import { MockSubscriptionLink } from '@apollo/client/testing';
import { Box } from '@mui/material';
import QueryBuilderPreview, { QueryBuilderPreview as QueryBuilderPreviewComponent } from './QueryBuilderPreview';
import { QueryChip } from './QueryChipBuilder';

type Story = StoryObj<typeof QueryBuilderPreviewComponent>;

const meta: Meta<typeof QueryBuilderPreviewComponent> = {
  title: 'Search/QueryBuilderPreview',
  component: QueryBuilderPreviewComponent,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const baseChips: QueryChip[] = [
  { id: 'c1', field: 'type', operator: 'equals', value: 'Person', type: 'filter' },
  { id: 'c2', field: 'risk_score', operator: 'greater than', value: '0.7', type: 'filter' },
];

export const LivePreview: Story = {
  render: () => {
    const subscriptionLink = useMemo(() => new MockSubscriptionLink(), []);

    useEffect(() => {
      let secondTimer: number | undefined;

      const firstTimer = window.setTimeout(() => {
        subscriptionLink.simulateResult({
          result: {
            data: {
              graphQueryPreview: {
                eventId: 'event-1',
                partial: true,
                progress: { completed: 1, total: 3, percentage: 33.3 },
                statistics: { nodeCount: 2, edgeCount: 1 },
                nodes: [
                  { id: 'n1', label: 'Alex Rivera', type: 'Person' },
                  { id: 'n2', label: 'Helios Labs', type: 'Organization' },
                ],
                edges: [
                  { id: 'e1', source: 'n1', target: 'n2', type: 'EMPLOYED_BY' },
                ],
                errors: null,
              },
            },
          },
        });

        secondTimer = window.setTimeout(() => {
          subscriptionLink.simulateResult({
            result: {
              data: {
                graphQueryPreview: {
                  eventId: 'event-2',
                  partial: false,
                  progress: { completed: 3, total: 3, percentage: 100 },
                  statistics: { nodeCount: 4, edgeCount: 3 },
                  nodes: [
                    { id: 'n1', label: 'Alex Rivera', type: 'Person' },
                    { id: 'n2', label: 'Helios Labs', type: 'Organization' },
                    { id: 'n3', label: 'Ivy Chen', type: 'Person' },
                    { id: 'n4', label: 'Frontier Holdings', type: 'Organization' },
                  ],
                  edges: [
                    { id: 'e1', source: 'n1', target: 'n2', type: 'EMPLOYED_BY' },
                    { id: 'e2', source: 'n3', target: 'n4', type: 'CONSULTS_FOR' },
                    { id: 'e3', source: 'n1', target: 'n3', type: 'KNOWS' },
                  ],
                  errors: null,
                },
              },
            },
          });
        }, 1200);
      }, 400);

      return () => {
        window.clearTimeout(firstTimer);
        if (secondTimer) {
          window.clearTimeout(secondTimer);
        }
      };
    }, [subscriptionLink]);

    return (
      <MockedProvider link={subscriptionLink}>
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <QueryBuilderPreview initialChips={baseChips} />
        </Box>
      </MockedProvider>
    );
  },
};
