import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import GoldenPathWizard from '../GoldenPathWizard';

jest.mock('@apollo/client', () => ({
  useMutation: () => [jest.fn(), { loading: false }],
  gql: (v) => v,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('GoldenPathWizard accessibility', () => {
  it('has no obvious accessibility violations when open', async () => {
    const { container } = render(
      <GoldenPathWizard open onClose={jest.fn()} onComplete={jest.fn()} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
