import React from 'react';
import { render } from '@testing-library/react';
import TestApp from './App.test-simple';

test('mounts TestApp without crashing', () => {
  const { container } = render(<TestApp />);
  expect(container.firstChild).toBeTruthy();
});

