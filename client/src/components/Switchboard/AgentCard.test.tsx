import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentCard from './AgentCard';
import { Agent } from './types';

describe('AgentCard', () => {
  const mockAgents: Agent[] = [
    { id: 'agent1', name: 'Test Agent 1', tags: ['tag1', 'tag2'] },
  ];

  it('renders the agent card with all elements', () => {
    const handleChat = vi.fn();
    render(<AgentCard agents={mockAgents} onChat={handleChat} />);

    expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    expect(screen.getByText('tag1 • tag2')).toBeInTheDocument();

    const chatButton = screen.getByText('Chat');
    fireEvent.click(chatButton);
    expect(handleChat).toHaveBeenCalledTimes(1);
  });
});
