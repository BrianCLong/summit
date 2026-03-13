import React from 'react';
import { navigationMap, getNavigationForRole, type Role } from '../navigation-map';

export interface NavigationRailProps {
  currentPath: string;
  userRole: Role;
  onNavigate: (path: string) => void;
}

/** Icon mapping — uses inline SVG paths for zero-dependency rendering */
const iconPaths: Record<string, string> = {
  LayoutDashboard: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z',
  Search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  Network: 'M12 2a3 3 0 00-3 3c0 1.1.6 2.1 1.5 2.6L9 12l-3.5-1.4A3 3 0 002 8a3 3 0 003 3l1.5 4.5L5 17a3 3 0 103 3l4-2 4 2a3 3 0 103-3l-1.5-1.5L20 11a3 3 0 00-3-3 3 3 0 00-2.5 4.6L12 14l-1.5-4.4A3 3 0 0012 5a3 3 0 00-3-3z',
  GitBranch: 'M6 3v12m0 0a3 3 0 103 3 3 3 0 00-3-3zm12-3a3 3 0 10-3-3 3 3 0 003 3zm0 0v-4a2 2 0 00-2-2h-4',
  Building2: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m4-8h2m4 0h2m-6 4h2m4 0h2',
  Bot: 'M12 2a2 2 0 012 2v1h2a2 2 0 012 2v3a2 2 0 01-2 2h-1v2h3a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a2 2 0 012-2h3v-2H9a2 2 0 01-2-2V7a2 2 0 012-2h2V4a2 2 0 012-2z',
  FlaskConical: 'M10 2v6.5L4 20h16L14 8.5V2m-4 0h4m-8 18h12',
  ShieldAlert: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm0-14v4m0 4h.01',
  Database: 'M3 5a9 3 0 0118 0M3 5v14a9 3 0 0018 0V5M3 12a9 3 0 0018 0',
  TestTube: 'M14.5 2v6.5L18 20H6l3.5-11.5V2m-3 0h8',
  Scale: 'M12 3v18m-7-7l7-7 7 7M5 17h14',
  Settings2: 'M12 3a9 9 0 110 18 9 9 0 010-18zm0 4a5 5 0 100 10 5 5 0 000-10z',
  Settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zm0 0',
};

const NavIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[name] || iconPaths.Settings} />
  </svg>
);

export const NavigationRail: React.FC<NavigationRailProps> = ({ currentPath, userRole, onNavigate }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

  const visibleNav = getNavigationForRole(userRole);

  return (
    <nav
      className={`h-full shrink-0 bg-bg-secondary border-r border-border-default flex flex-col transition-all duration-slow ${expanded ? 'w-60' : 'w-16'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setHoveredItem(null); }}
    >
      {/* Logo */}
      <div className="h-12 flex items-center justify-center border-b border-border-default shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-tertiary flex items-center justify-center">
          <span className="text-white font-bold text-sm">S</span>
        </div>
        {expanded && <span className="ml-3 text-sm font-semibold text-fg-primary">Summit</span>}
      </div>

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {visibleNav.map((item) => {
          const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
          const isHovered = hoveredItem === item.id;

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onNavigate(item.path)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={[
                  'w-full flex items-center gap-3 px-4 h-10 transition-all duration-fast',
                  isActive
                    ? 'text-brand-primary bg-brand-primary/10 border-r-2 border-brand-primary'
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary/50',
                ].join(' ')}
                title={expanded ? undefined : item.label}
              >
                <NavIcon name={item.icon} className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-primary' : ''}`} />
                {expanded && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {!expanded && item.badge && (
                  <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-brand-primary" />
                )}
              </button>

              {/* Flyout submenu when collapsed */}
              {!expanded && isHovered && item.children && item.children.length > 0 && (
                <div className="absolute left-full top-0 ml-1 bg-bg-elevated border border-border-default rounded-lg shadow-lg py-1 min-w-48 z-popover">
                  <div className="px-3 py-1.5 text-xs font-semibold text-fg-tertiary uppercase">{item.label}</div>
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onNavigate(child.path)}
                      className="w-full text-left px-3 py-1.5 text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-surfaceHover transition-colors"
                    >
                      {child.label}
                      {child.badge && (
                        <span className="ml-2 px-1.5 py-0.5 text-2xs rounded-full bg-brand-primary/15 text-brand-primary">{child.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="border-t border-border-default p-2 shrink-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center h-8 text-fg-tertiary hover:text-fg-secondary transition-colors rounded hover:bg-bg-tertiary"
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
};
