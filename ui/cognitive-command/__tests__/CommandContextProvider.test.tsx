import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandContextProvider, useCommandContext } from '../CommandContextProvider';

function TestConsumer() {
  const { state, setMode, toggleCommandPalette } = useCommandContext();
  return (
    <div>
      <span data-testid="mode">{state.context.activeMode}</span>
      <span data-testid="palette">{String(state.isCommandPaletteOpen)}</span>
      <button onClick={() => setMode('forecast')}>Set Forecast</button>
      <button onClick={() => setMode('simulate')}>Set Simulate</button>
      <button onClick={() => setMode('intervene')}>Set Intervene</button>
      <button onClick={() => setMode('govern')}>Set Govern</button>
      <button onClick={toggleCommandPalette}>Toggle Palette</button>
    </div>
  );
}

describe('CommandContextProvider', () => {
  it('provides default observe mode', () => {
    render(
      <CommandContextProvider>
        <TestConsumer />
      </CommandContextProvider>
    );
    expect(screen.getByTestId('mode').textContent).toBe('observe');
  });

  it('switches modes correctly', () => {
    render(
      <CommandContextProvider>
        <TestConsumer />
      </CommandContextProvider>
    );
    fireEvent.click(screen.getByText('Set Forecast'));
    expect(screen.getByTestId('mode').textContent).toBe('forecast');
  });

  it('toggles command palette', () => {
    render(
      <CommandContextProvider>
        <TestConsumer />
      </CommandContextProvider>
    );
    expect(screen.getByTestId('palette').textContent).toBe('false');
    fireEvent.click(screen.getByText('Toggle Palette'));
    expect(screen.getByTestId('palette').textContent).toBe('true');
  });

  it('throws when used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useCommandContext must be used within CommandContextProvider');
  });
});
