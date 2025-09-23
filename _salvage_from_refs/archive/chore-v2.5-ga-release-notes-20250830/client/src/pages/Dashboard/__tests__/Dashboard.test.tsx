import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import store from '../../../store/index';
import Dashboard from '../index';

test('renders dashboard skeletons then content', async () => {
  render(<Provider store={store}><Dashboard /></Provider>);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
