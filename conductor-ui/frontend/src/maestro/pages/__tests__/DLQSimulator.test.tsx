import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as api from '../../api';
import DLQSimulator from '../DLQSimulator';

test('shows decision', async () => {
  jest.spyOn(api, 'api').mockReturnValue({
    getDLQ: async () => ({
      items: [
        {
          id: 'x',
          runId: 'r',
          stepId: 's',
          kind: 'BUILD_IMAGE',
          error: 'boom',
          ts: Date.now(),
        },
      ],
    }),
    simulateDLQPolicy: async () => ({
      decision: 'ALLOW',
      normalizedSignature: 'sig',
      enabled: true,
      dryRun: false,
      passKind: true,
      passSig: true,
      rateLimited: false,
      reasons: [],
    }),
  } as any);
  render(<DLQSimulator />);
  const select = await screen.findByLabelText('Pick existing DLQ item');
  fireEvent.change(select, { target: { value: 'x' } });
  fireEvent.click(screen.getByText('Simulate'));
  expect(await screen.findByText('ALLOW')).toBeInTheDocument();
});
