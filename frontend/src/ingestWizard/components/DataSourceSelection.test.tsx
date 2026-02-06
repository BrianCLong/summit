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

  it('shows validation message for missing fields', () => {
    const mockOnChange = vi.fn();
    const { rerender } = render(
      <DataSourceSelection
        value={{}}
        onChange={mockOnChange}
      />
    );

    // Initial state: all required fields are missing
    const validationMessage = screen.getByRole('status');
    expect(validationMessage.textContent).toContain('Missing: Name, Source type, License template');

    // Update with Name provided
    rerender(
      <DataSourceSelection
        value={{ name: 'Test Source' }}
        onChange={mockOnChange}
      />
    );
    expect(validationMessage.textContent).toContain('Missing: Source type, License template');
    expect(validationMessage.textContent).not.toContain('Name,'); // Should not have "Name" in the list

    // Update with Source Type provided
    rerender(
      <DataSourceSelection
        // @ts-ignore
        value={{ name: 'Test Source', source_type: 'csv' }}
        onChange={mockOnChange}
      />
    );
    expect(validationMessage.textContent).toContain('Missing: License template');

    // Update with License provided (all complete)
    rerender(
      <DataSourceSelection
        // @ts-ignore
        value={{ name: 'Test Source', source_type: 'csv', license_template: 'cc-by-4.0' }}
        onChange={mockOnChange}
      />
    );

    // Message should be gone
    expect(screen.queryByRole('status')).toBeNull();
  });
});
