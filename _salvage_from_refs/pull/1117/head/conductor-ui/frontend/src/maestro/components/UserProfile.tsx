import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { user, logout, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showTenantSwitcher, setShowTenantSwitcher] = useState(false);

  if (!user) return null;

  const currentTenant = user.tenant;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-xs font-semibold">
            {user.email.split('@')[0].slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="text-left hidden md:block">
          <div className="font-medium text-slate-900">{user.email.split('@')[0]}</div>
          <div className="text-xs text-slate-500">{currentTenant}</div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user.email.split('@')[0].slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-slate-900">{user.email.split('@')[0]}</div>
                <div className="text-sm text-slate-600">{user.email}</div>
                <div className="text-xs text-slate-500">via Mock Auth</div>
              </div>
            </div>
          </div>

          {/* Current Tenant */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Current Tenant</span>
              {user.tenants && user.tenants.length > 1 && (
                <button
                  onClick={() => setShowTenantSwitcher(!showTenantSwitcher)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Switch
                </button>
              )}
            </div>
            <div className="text-sm text-slate-900 font-mono">{currentTenant}</div>

            {showTenantSwitcher && user.tenants && user.tenants.length > 1 && (
              <div className="mt-2 space-y-1">
                {user.tenants.map((tenant) => (
                  <button
                    key={tenant}
                    onClick={() => {
                      switchTenant(tenant);
                      setShowTenantSwitcher(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-sm ${
                      tenant === currentTenant
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {tenant}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Roles */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-medium text-slate-700 mb-2">Roles</div>
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Additional info can be added here if needed */}

          {/* Actions */}
          <div className="px-4 py-3">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setShowTenantSwitcher(false);
          }}
        />
      )}
    </div>
  );
};

export default UserProfile;
