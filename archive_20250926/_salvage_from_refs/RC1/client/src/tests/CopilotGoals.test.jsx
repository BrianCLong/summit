import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import CopilotGoals from '../components/ai/CopilotGoals.jsx';
import { GET_GOALS, GET_INVESTIGATIONS, CREATE_GOAL } from '../../__mocks__/copilotGoalsMocks';

test('creates and lists a goal', async () => {
  render(
    <MockedProvider mocks={[/* define GET_INVESTIGATIONS, GET_GOALS, CREATE_GOAL mocks */]} addTypename={false}>
      <CopilotGoals />
    </MockedProvider>
  );

  // enter text, submit, wait for render
  fireEvent.change(screen.getByPlaceholderText(/identify likely coordinators/i), { target: { value: 'Test goal' }});
  fireEvent.click(screen.getByRole('button', { name: /create goal/i }));
  await waitFor(() => expect(screen.getByText(/Test goal/)).toBeInTheDocument());
});