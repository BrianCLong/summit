/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================
// Maestro UI Dashboard - Complete Web Console
// =============================================
import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import {
  HomeIcon,
  PlayIcon,
  DocumentTextIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  QueueListIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { CommandPaletteProvider } from '../../contexts/CommandPaletteContext'
import { NotificationProvider } from '../../contexts/NotificationContext'

// Import page components (to be created)
import Overview from './pages/Overview'
import Runs from './pages/Runs'
import Runbooks from './pages/Runbooks'
import Approvals from './pages/Approvals'
import Artifacts from './pages/Artifacts'
import Policies from './pages/Policies'
import Budgets from './pages/Budgets'
import Observability from './pages/Observability'
import DLQReplay from './pages/DLQReplay'
import Integrations from './pages/Integrations'
import Admin from './pages/Admin'
import Audit from './pages/Audit'

// Global banner component
function MaestroBanner() {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="flex items-center justify-center text-sm text-blue-800">
        <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
        <strong>Maestro builds IntelGraph</strong> — This is the conductor
        interface, not the IntelGraph product.
      </div>
    </div>
  )
}

// Navigation component
function MaestroNavigation() {
  const location = useLocation()

  const navItems = [
    { path: '/maestro', icon: HomeIcon, label: 'Overview', exact: true },
    { path: '/maestro/runs', icon: PlayIcon, label: 'Runs' },
    { path: '/maestro/runbooks', icon: DocumentTextIcon, label: 'Runbooks' },
    { path: '/maestro/approvals', icon: ClockIcon, label: 'Approvals' },
    { path: '/maestro/artifacts', icon: ArchiveBoxIcon, label: 'Artifacts' },
    { path: '/maestro/policies', icon: ShieldCheckIcon, label: 'Policies' },
    { path: '/maestro/budgets', icon: CurrencyDollarIcon, label: 'Budgets' },
    {
      path: '/maestro/observability',
      icon: ChartBarIcon,
      label: 'Observability',
    },
    { path: '/maestro/dlq', icon: QueueListIcon, label: 'DLQ & Replay' },
    {
      path: '/maestro/integrations',
      icon: CommandLineIcon,
      label: 'Integrations',
    },
    { path: '/maestro/admin', icon: Cog6ToothIcon, label: 'Admin' },
  ]

  return (
    <nav className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-900">🎼 Maestro</h1>
        <p className="text-sm text-gray-500">Build Orchestrator</p>
      </div>

      <div className="px-2 pb-4">
        {navItems.map(item => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2 text-sm rounded-md mb-1 transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Context bar for tenant/environment switching
function ContextBar() {
  const [tenant, setTenant] = useState('default')
  const [environment, setEnvironment] = useState('dev')

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Tenant:</label>
            <select
              value={tenant}
              onChange={e => setTenant(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="default">Default</option>
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Environment:
            </label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="dev">Development</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-sm text-blue-600 hover:text-blue-800">
            Command Palette (⌘K)
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <button className="text-sm text-gray-600 hover:text-gray-800">
            User Menu
          </button>
        </div>
      </div>
    </div>
  )
}

// Main dashboard layout component
export default function MaestroDashboard() {
  return (
    <CommandPaletteProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-gray-50">
          <MaestroBanner />

          <div className="flex h-[calc(100vh-theme(spacing.12))]">
            <MaestroNavigation />

            <div className="flex-1 flex flex-col">
              <ContextBar />

              <main className="flex-1 overflow-y-auto">
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/maestro" replace />}
                  />
                  <Route path="/maestro" element={<Overview />} />
                  <Route path="/maestro/runs/*" element={<Runs />} />
                  <Route path="/maestro/runbooks/*" element={<Runbooks />} />
                  <Route path="/maestro/approvals" element={<Approvals />} />
                  <Route path="/maestro/artifacts/*" element={<Artifacts />} />
                  <Route path="/maestro/policies/*" element={<Policies />} />
                  <Route path="/maestro/budgets" element={<Budgets />} />
                  <Route
                    path="/maestro/observability"
                    element={<Observability />}
                  />
                  <Route path="/maestro/dlq" element={<DLQReplay />} />
                  <Route
                    path="/maestro/integrations/*"
                    element={<Integrations />}
                  />
                  <Route path="/maestro/admin/*" element={<Admin />} />
                  <Route path="/maestro/audit" element={<Audit />} />
                </Routes>
              </main>
            </div>
          </div>
        </div>
      </NotificationProvider>
    </CommandPaletteProvider>
  )
}
