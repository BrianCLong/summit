import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentEditDialog from '../../components/AgentEditDialog';

test('renders diff and approves', async () => {
  const onApprove = jest.fn().mockResolvedValue(undefined);
  render(
    <AgentEditDialog
      open
      original={'a\nb'}
      onClose={() => {}}
      onApprove={onApprove}
    />,
  );
  expect(screen.getByLabelText('Draft text')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Approve & apply'));
  expect(onApprove).toHaveBeenCalled();
});
