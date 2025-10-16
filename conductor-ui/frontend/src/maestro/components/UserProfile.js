import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
const UserProfile = () => {
  const { user, logout, tenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  if (!user) return null;
  const currentTenant = tenant?.name || user.tenant || 'default';
  return _jsxs('div', {
    className: 'relative',
    children: [
      _jsxs('button', {
        onClick: () => setIsOpen(!isOpen),
        className:
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500',
        'aria-expanded': isOpen,
        'aria-haspopup': 'true',
        children: [
          _jsx('div', {
            className:
              'h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center',
            children: _jsx('span', {
              className: 'text-white text-xs font-semibold',
              children: user.email.split('@')[0].slice(0, 2).toUpperCase(),
            }),
          }),
          _jsxs('div', {
            className: 'text-left hidden md:block',
            children: [
              _jsx('div', {
                className: 'font-medium text-slate-900',
                children: user.email.split('@')[0],
              }),
              _jsx('div', {
                className: 'text-xs text-slate-500',
                children: currentTenant,
              }),
            ],
          }),
          _jsx('svg', {
            className: `w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`,
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24',
            children: _jsx('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M19 9l-7 7-7-7',
            }),
          }),
        ],
      }),
      isOpen &&
        _jsxs('div', {
          className:
            'absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50',
          children: [
            _jsx('div', {
              className: 'px-4 py-3 border-b border-slate-100',
              children: _jsxs('div', {
                className: 'flex items-center gap-3',
                children: [
                  _jsx('div', {
                    className:
                      'h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center',
                    children: _jsx('span', {
                      className: 'text-white font-semibold',
                      children: user.email
                        .split('@')[0]
                        .slice(0, 2)
                        .toUpperCase(),
                    }),
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('div', {
                        className: 'font-medium text-slate-900',
                        children: user.name || user.email.split('@')[0],
                      }),
                      _jsx('div', {
                        className: 'text-sm text-slate-600',
                        children: user.email,
                      }),
                      _jsx('div', {
                        className: 'text-xs text-slate-500',
                        children: 'via OIDC',
                      }),
                    ],
                  }),
                ],
              }),
            }),
            _jsxs('div', {
              className: 'px-4 py-3 border-b border-slate-100',
              children: [
                _jsx('div', {
                  className: 'flex items-center justify-between mb-2',
                  children: _jsx('span', {
                    className: 'text-sm font-medium text-slate-700',
                    children: 'Current Tenant',
                  }),
                }),
                _jsx('div', {
                  className: 'text-sm text-slate-900 font-mono',
                  children: currentTenant,
                }),
                tenant?.tier &&
                  _jsxs('div', {
                    className: 'text-xs text-slate-500 mt-1',
                    children: ['Tier: ', tenant.tier],
                  }),
              ],
            }),
            _jsxs('div', {
              className: 'px-4 py-3 border-b border-slate-100',
              children: [
                _jsx('div', {
                  className: 'text-sm font-medium text-slate-700 mb-2',
                  children: 'Roles',
                }),
                _jsx('div', {
                  className: 'flex flex-wrap gap-1',
                  children: user.roles.map((role) =>
                    _jsx(
                      'span',
                      {
                        className:
                          'px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full',
                        children: role,
                      },
                      role,
                    ),
                  ),
                }),
              ],
            }),
            _jsx('div', {
              className: 'px-4 py-3',
              children: _jsx('button', {
                onClick: () => {
                  logout();
                  setIsOpen(false);
                },
                className:
                  'w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md',
                children: 'Sign Out',
              }),
            }),
          ],
        }),
      isOpen &&
        _jsx('div', {
          className: 'fixed inset-0 z-40',
          onClick: () => {
            setIsOpen(false);
            setShowTenantSwitcher(false);
          },
        }),
    ],
  });
};
export default UserProfile;
