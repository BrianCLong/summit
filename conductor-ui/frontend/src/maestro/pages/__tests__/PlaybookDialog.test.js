import { jsx as _jsx } from 'react/jsx-runtime';
import { render, screen, fireEvent } from '@testing-library/react';
import * as api from '../../api';
import PlaybookDialog from '../../components/PlaybookDialog';
test('playbook adds signature', async () => {
  jest.spyOn(api, 'api').mockReturnValue({
    getDLQPolicy: async () => ({ allowSignatures: [] }),
    putDLQPolicy: async () => ({ ok: true }),
  });
  render(
    _jsx(PlaybookDialog, {
      open: true,
      onClose: () => {},
      sig: 'timeout after {num}ms',
      providerGuess: 'llm',
    }),
  );
  fireEvent.click(screen.getByText('Allow auto-replay'));
  expect(await screen.findByText(/Added to auto-replay/)).toBeInTheDocument();
});
