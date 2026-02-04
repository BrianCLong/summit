import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataSourceSelection from './DataSourceSelection';
import React from 'react';

describe('DataSourceSelection', () => {
  it('renders required indicators for mandatory fields', () => {
    const mockOnChange = vi.fn();
    render(
      <DataSourceSelection
        value={{}}
        onChange={mockOnChange}
      />
    );

    const requiredFields = ['Name', 'Source type', 'License template'];

    requiredFields.forEach(field => {
      const labelSpan = screen.getByText(new RegExp(field), { selector: '.iw-label' });

      const indicator = labelSpan.querySelector('.iw-required-indicator');
      // Using standard assertions instead of jest-dom matchers
      expect(indicator).not.toBeNull();
      expect(indicator?.textContent).toContain('*');
      expect(indicator?.getAttribute('aria-hidden')).toBe('true');
    });

    const licenseLabelSpan = screen.getByText(/License template/, { selector: '.iw-label' });
    const licenseLabel = licenseLabelSpan.closest('label');
    const licenseSelect = licenseLabel?.querySelector('select');

    expect(licenseSelect).not.toBeNull();
    expect(licenseSelect?.hasAttribute('required')).toBe(true);
  });
});
