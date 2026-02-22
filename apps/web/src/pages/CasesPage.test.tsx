import { render, screen } from '@testing-library/react';
import CasesPage from './CasesPage';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('CasesPage', () => {
  it('renders filter labels associated with inputs', () => {
    render(
      <MemoryRouter>
        <CasesPage />
      </MemoryRouter>
    );

    // Check if labels are associated with selects
    const statusSelect = screen.getByLabelText('Status');
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect.tagName).toBe('SELECT');

    const prioritySelect = screen.getByLabelText('Priority');
    expect(prioritySelect).toBeInTheDocument();
    expect(prioritySelect.tagName).toBe('SELECT');
  });

  it('renders case cards as accessible links', () => {
    render(
      <MemoryRouter>
        <CasesPage />
      </MemoryRouter>
    );

    // Find all links that go to /cases/case-*
    const links = screen.getAllByRole('link');
    const caseLinks = links.filter(link => link.getAttribute('href')?.startsWith('/cases/case-'));

    expect(caseLinks.length).toBeGreaterThan(0);

    // Check the first link
    const firstLink = caseLinks[0];
    expect(firstLink).toHaveClass('block');
    expect(firstLink).toHaveClass('group');
  });
});
