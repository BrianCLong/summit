import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandContextProvider, useCommandContext } from '../CommandContextProvider';
import { GlobalMissionRail } from '../GlobalMissionRail';

function ModeDisplay() {
  const { state } = useCommandContext();
  return <span data-testid="current-mode">{state.context.activeMode}</span>;
}

describe('GlobalMissionRail', () => {
  it('renders all six command modes', () => {
    render(
      <CommandContextProvider>
        <GlobalMissionRail />
      </CommandContextProvider>
    );
    expect(screen.getByText('OBS')).toBeDefined();
    expect(screen.getByText('INV')).toBeDefined();
    expect(screen.getByText('FCT')).toBeDefined();
    expect(screen.getByText('SIM')).toBeDefined();
    expect(screen.getByText('INT')).toBeDefined();
    expect(screen.getByText('GOV')).toBeDefined();
  });

  it('switches mode on click', () => {
    render(
      <CommandContextProvider>
        <GlobalMissionRail />
        <ModeDisplay />
      </CommandContextProvider>
    );
    fireEvent.click(screen.getByText('FCT'));
    expect(screen.getByTestId('current-mode').textContent).toBe('forecast');
  });

  it('has navigation role', () => {
    render(
      <CommandContextProvider>
        <GlobalMissionRail />
      </CommandContextProvider>
    );
    expect(screen.getByRole('navigation', { name: 'Command modes' })).toBeDefined();
  });
});
