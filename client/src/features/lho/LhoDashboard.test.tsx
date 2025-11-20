import { render, screen, within } from '@testing-library/react';
import { LhoDashboard } from './LhoDashboard';

describe('LhoDashboard', () => {
  it('renders summary and verifies custody chain', async () => {
    render(<LhoDashboard />);

    expect(screen.getByText('Hold Summary')).toBeInTheDocument();
    expect(await screen.findByText('Chain intact')).toBeInTheDocument();
    expect(screen.getByText('hold-123')).toBeInTheDocument();
  });

  it('shows deterministic diff ordering', async () => {
    render(<LhoDashboard />);

    const addedPanel = screen.getByText('Added').closest('div');
    expect(addedPanel).toBeTruthy();
    const list = within(addedPanel as HTMLElement).getAllByRole('listitem');
    const systems = list.map((item) => item.textContent?.split(':')[0]?.trim());
    expect(systems).toEqual(['elasticsearch', 'kafka', 'lifecycle', 'postgres', 's3']);
  });
});
