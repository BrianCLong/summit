import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Shield, Network, FileText, CheckCircle } from 'lucide-react';

const SwitchboardLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      <aside className="w-64 border-r bg-white dark:bg-slate-800 dark:border-slate-700">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            Switchboard
          </h2>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Tenant Ops Console</p>
        </div>
        <nav className="px-4 space-y-2">
          <NavLink
            to="/switchboard/onboarding"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`
            }
          >
            <CheckCircle className="w-4 h-4" />
            Onboarding Wizard
          </NavLink>
          <NavLink
            to="/switchboard/plans"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`
            }
          >
            <Shield className="w-4 h-4" />
            Plans & Limits
          </NavLink>
          <NavLink
            to="/switchboard/networking"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`
            }
          >
            <Network className="w-4 h-4" />
            Networking
          </NavLink>
          <NavLink
            to="/switchboard/fundability"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`
            }
          >
            <FileText className="w-4 h-4" />
            Fundability Pack
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default SwitchboardLayout;
