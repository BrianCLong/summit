import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommandPalette from '../components/CommandPalette';

describe('CommandPalette', () => {
  it('opens on Ctrl+Shift+P', async () => {
    render(<CommandPalette />);

    expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();

    fireEvent.keyDown(window, {
      key: 'p',
      code: 'KeyP',
      ctrlKey: true,
      shiftKey: true,
    });

    await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
     render(<CommandPalette />);

    // Open it
    fireEvent.keyDown(window, {
      key: 'p',
      code: 'KeyP',
      ctrlKey: true,
      shiftKey: true,
    });

    const input = await screen.findByPlaceholderText(/Type a command/i);

    // Initial state: index 0 selected.
    const items = screen.getAllByRole('option');
    expect(items[0]).toHaveAttribute('aria-selected', 'true');

    // ArrowDown -> Selects index 1
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });

    expect(items[0]).toHaveAttribute('aria-selected', 'false');
    expect(items[1]).toHaveAttribute('aria-selected', 'true');
  });
});
