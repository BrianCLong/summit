import { jsx as _jsx } from 'react/jsx-runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import MaestroApp from './App';
import '../index.css';
// Simplified telemetry setup - comment out complex OpenTelemetry for now
// TODO: Add proper OpenTelemetry configuration when exporter packages are available
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(_jsx(React.StrictMode, { children: _jsx(MaestroApp, {}) }));
