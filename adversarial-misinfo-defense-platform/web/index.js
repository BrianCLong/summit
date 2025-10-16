/**
 * Main entry point for Adversarial Misinformation Defense Platform Web UI
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import components
import App from './components/App';
import Dashboard from './components/Dashboard';
import ScenarioBuilder from './components/ScenarioBuilder';
import ExerciseRunner from './components/ExerciseRunner';
import ValidationSuite from './components/ValidationSuite';
import TrainingCenter from './components/TrainingCenter';
import TacticEvolver from './components/TacticEvolver';
import Reports from './components/Reports';

// Create router
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: 'scenarios',
        element: <ScenarioBuilder />
      },
      {
        path: 'exercises',
        element: <ExerciseRunner />
      },
      {
        path: 'validation',
        element: <ValidationSuite />
      },
      {
        path: 'training',
        element: <TrainingCenter />
      },
      {
        path: 'evolution',
        element: <TacticEvolver />
      },
      {
        path: 'reports',
        element: <Reports />
      }
    ]
  }
]);

// Render application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <ToastContainer />
  </React.StrictMode>
);