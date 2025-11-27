import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from './CommandPalette';

describe('CommandPalette', () => {
  it('filters commands based on user input', () => {
    const handleCommandSelect = vi.fn();
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        onCommandSelect={handleCommandSelect}
      />
    );

    const input = screen.getByPlaceholderText(
      '/call maestro | /present deck | /join room | /status api'
    );
    fireEvent.change(input, { target: { value: 'scribe' } });

    expect(screen.getByText('Message Scribe')).toBeInTheDocument();
    expect(screen.queryByText('Start meeting')).not.toBeInTheDocument();
  });
});
