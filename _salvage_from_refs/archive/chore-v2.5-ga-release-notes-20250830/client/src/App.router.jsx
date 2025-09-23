import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import AppHeader from './layout/AppHeader';
import store from './store/index.ts';
import { WithApollo } from './apollo/index';

const Dashboard = lazy(() => import('./pages/Dashboard/index'));
const GraphWorkbench = lazy(() => import('./pages/GraphWorkbench/index'));
const InvestigationList = lazy(() => import('./pages/Investigations/InvestigationList'));
const InvestigationDetail = lazy(() => import('./pages/Investigations/InvestigationDetail'));
const HuntList = lazy(() => import('./pages/Hunting/HuntList'));
const HuntRun = lazy(() => import('./pages/Hunting/HuntRun'));
const IOCList = lazy(() => import('./pages/IOC/IOCList'));
const IOCDetail = lazy(() => import('./pages/IOC/IOCDetail'));
const SearchHome = lazy(() => import('./pages/Search/SearchHome'));

function Loader() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="60vh" aria-live="polite" role="status">
      <CircularProgress size={32} />
    </Box>
  );
}

export default function AppRouter() {
  return (
    <Provider store={store}>
      <WithApollo>
        <CssBaseline />
        <BrowserRouter>
          <AppHeader />
          <Suspense fallback={<Loader />}> 
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/graph" element={<GraphWorkbench />} />
              <Route path="/investigations" element={<InvestigationList />} />
              <Route path="/investigations/:id" element={<InvestigationDetail />} />
              <Route path="/hunts" element={<HuntList />} />
              <Route path="/hunts/:id" element={<HuntRun />} />
              <Route path="/ioc" element={<IOCList />} />
              <Route path="/ioc/:id" element={<IOCDetail />} />
              <Route path="/search" element={<SearchHome />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WithApollo>
    </Provider>
  );
}
