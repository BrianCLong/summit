/**
 * Layout Component
 *
 * Main application layout with navigation sidebar.
 */

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Tags,
  CheckSquare,
  Database,
  BarChart3,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLabelingStore } from '../../store/labelingStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/labeling', label: 'Labeling', icon: Tags },
  { path: '/review', label: 'Review', icon: CheckSquare },
  { path: '/datasets', label: 'Datasets', icon: Database },
  { path: '/quality', label: 'Quality', icon: BarChart3 },
];

export function Layout() {
  const { userId, setUserId } = useLabelingStore();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Tags className="h-6 w-6 text-primary" />
            <span className="ml-2 text-lg font-semibold">Data Factory</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <User className="mr-3 h-5 w-5" />
                <span className="truncate">{userId}</span>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border bg-card p-4 shadow-lg">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
