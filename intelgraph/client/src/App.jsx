import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ApolloProvider } from '@apollo/client'
import { ThemeProvider, CssBaseline } from '@mui/material'

import { store } from './store'
import { apolloClient } from './services/apollo'
import { theme } from './styles/theme'

import Layout from './components/common/Layout'
import LoginPage from './components/auth/LoginPage'
import Dashboard from './components/dashboard/Dashboard'
import InvestigationPage from './components/investigation/InvestigationPage'
import GraphExplorer from './components/graph/GraphExplorer'
import ActivitiesPage from './components/activities/ActivitiesPage'
import NotFound from './components/common/NotFound'

function App() {
  useEffect(() => {
    console.log('IntelGraph Platform Starting...')
  }, [])

  return (
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="investigations" element={<InvestigationPage />} />
                <Route path="graph" element={<GraphExplorer />} />
                <Route path="graph/:id" element={<GraphExplorer />} />
                <Route path="activities" element={<ActivitiesPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </ThemeProvider>
      </ApolloProvider>
    </Provider>
  )
}

export default App
