import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskBacklog } from '../src/pages/TaskBacklog';

describe('TaskBacklog Component', () => {
  it('renders backlog columns and initial tasks', () => {
    render(<TaskBacklog />);

    // Check columns
    expect(screen.getByText(/Todo \(\d+\)/)).toBeInTheDocument();
    expect(screen.getByText(/In Progress \(\d+\)/)).toBeInTheDocument();
    expect(screen.getByText(/Done \(\d+\)/)).toBeInTheDocument();

    // Check tasks
    expect(screen.getByText('Audit frontend components')).toBeInTheDocument();
    expect(screen.getByText('Build Dashboard')).toBeInTheDocument();
    expect(screen.getByText('A11Y compliance')).toBeInTheDocument();
  });

  it('can start dragging a task', () => {
    render(<TaskBacklog />);
    const task = screen.getByText('Audit frontend components');

    const mockDataTransfer = {
      setData: vi.fn(),
    };

    fireEvent.dragStart(task, { dataTransfer: mockDataTransfer });
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('taskId', 't1');
  });
});
