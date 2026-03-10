import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CognitivePanelHost } from '../CognitivePanelHost';

describe('CognitivePanelHost', () => {
  it('renders title and children', () => {
    render(
      <CognitivePanelHost title="Test Panel">
        <div>Panel content</div>
      </CognitivePanelHost>
    );
    expect(screen.getByText('Test Panel')).toBeDefined();
    expect(screen.getByText('Panel content')).toBeDefined();
  });

  it('collapses and expands', () => {
    render(
      <CognitivePanelHost title="Collapsible">
        <div>Content</div>
      </CognitivePanelHost>
    );
    expect(screen.getByText('Content')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Collapse panel'));
    expect(screen.queryByText('Content')).toBeNull();
    fireEvent.click(screen.getByLabelText('Expand panel'));
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('has region role with title as label', () => {
    render(
      <CognitivePanelHost title="My Region">
        <div>Content</div>
      </CognitivePanelHost>
    );
    expect(screen.getByRole('region', { name: 'My Region' })).toBeDefined();
  });
});
