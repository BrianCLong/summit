import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandContextProvider, useCommandContext } from '../CommandContextProvider';
import { GlobalMissionRail } from '../GlobalMissionRail';

function ModeDisplay() {
  const { state } = useCommandContext();
  return <span data-testid="mode">{state.context.activeMode}</span>;
}

describe('Keyboard Navigation', () => {
  it('switches to observe mode with Alt+1', () => {
    render(
      <CommandContextProvider>
        <GlobalMissionRail />
        <ModeDisplay />
      </CommandContextProvider>
    );
    // First switch to another mode
    fireEvent.click(screen.getByText('FCT'));
    expect(screen.getByTestId('mode').textContent).toBe('forecast');

    // Switch back with keyboard
    fireEvent.keyDown(window, { key: '1', altKey: true });
    expect(screen.getByTestId('mode').textContent).toBe('observe');
  });

  it('switches to forecast mode with Alt+3', () => {
    render(
      <CommandContextProvider>
        <GlobalMissionRail />
        <ModeDisplay />
      </CommandContextProvider>
    );
    fireEvent.keyDown(window, { key: '3', altKey: true });
    expect(screen.getByTestId('mode').textContent).toBe('forecast');
  });

  it('switches to govern mode with Alt+6', () => {
    render(
      <CommandContextProvider>
        <GlobalMissionRail />
        <ModeDisplay />
      </CommandContextProvider>
    );
    fireEvent.keyDown(window, { key: '6', altKey: true });
    expect(screen.getByTestId('mode').textContent).toBe('govern');
  });

  it('mode buttons have aria-pressed attribute', () => {
    render(
      <CommandContextProvider>
        <GlobalMissionRail />
      </CommandContextProvider>
    );
    const obsButton = screen.getByText('OBS');
    expect(obsButton.getAttribute('aria-pressed')).toBe('true');

    const fctButton = screen.getByText('FCT');
    expect(fctButton.getAttribute('aria-pressed')).toBe('false');
  });
});
