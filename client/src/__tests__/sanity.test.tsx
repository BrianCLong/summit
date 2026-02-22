import React from 'react';
import { render, screen } from '@testing-library/react';

function SanityComponent() {
  return <div>Sanity Check</div>;
}

test('sanity test', () => {
  render(<SanityComponent />);
  expect(screen.getByText('Sanity Check')).toBeTruthy(); // Using truthy to be safe if toBeInTheDocument is missing
});
