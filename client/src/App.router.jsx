import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import AppHeader from './layout/AppHeader.js';
import store from './store/index.js';
import { WithApollo } from './apollo/index.js';

const Dashboard = lazy(() => import('./pages/Dashboard/index.js'));
const GraphWorkbench = lazy(() => import('./pages/GraphWorkbench/index.js'));
const InvestigationList = lazy(() => import('./pages/Investigations/InvestigationList.js'));
const InvestigationDetail = lazy(() => import('./pages/Investigations/InvestigationDetail.js'));
const HuntList = lazy(() => import('./pages/Hunting/HuntList.js'));
const HuntRun = lazy(() => import('./pages/Hunting/HuntRun.js'));
const IOCList = lazy(() => import('./pages/IOC/IOCList.js'));
const IOCDetail = lazy(() => import('./pages/IOC/IOCDetail.js'));
const SearchHome = lazy(() => import('./pages/Search/SearchHome.js'));

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
