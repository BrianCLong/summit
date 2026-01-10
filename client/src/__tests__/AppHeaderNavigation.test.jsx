import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';

jest.mock('../services/apollo', () => ({ apolloClient: {} }));
jest.mock('../store', () => ({ store: { getState: () => ({}), dispatch: jest.fn(), subscribe: jest.fn() } }));
jest.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ hasRole: () => true, hasPermission: () => true }),
  AuthProvider: ({ children }) => children,
}));
jest.mock('../components/common/DemoIndicator', () => () => <div data-testid="demo-indicator" />);

import { AppHeader } from '../App.router.jsx';
import { buildRouteLabels } from '../routes/routeLabels';

describe('AppHeader navigation labels', () => {
  it('shows a descriptive label for the demo walkthrough route', () => {
    const routeLabels = buildRouteLabels([{ path: '/demo', label: 'Demo Walkthrough' }]);

    render(
      <MemoryRouter initialEntries={[{ pathname: '/demo' }]}>
        <ThemeProvider theme={createTheme()}>
          <CssBaseline />
          <Routes>
            <Route
              path="/demo"
              element={
                <AppHeader
                  onMenuClick={() => {}}
                  routeLabels={routeLabels}
                  currentPath="/demo"
                />
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/IntelGraph Platform - Demo Walkthrough/i),
    ).toBeInTheDocument();
  });
});
