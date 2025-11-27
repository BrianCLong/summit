import React from 'react';
import { render, screen } from '@testing-library/react';
import IngestWizard from './index';

describe('IngestWizard', () => {
  it('renders the IngestWizard component', () => {
    render(<IngestWizard />);
    expect(screen.getByText('Ingest Wizard')).toBeInTheDocument();
  });
});
