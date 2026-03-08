"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Navigation = Navigation;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const Tooltip_1 = require("@/components/ui/Tooltip");
const AuthContext_1 = require("@/contexts/AuthContext");
const SearchContext_1 = require("@/contexts/SearchContext");
const useRbac_1 = require("@/hooks/useRbac");
const utils_1 = require("@/lib/utils");
const navItems = [
    {
        name: 'Explore',
        href: '/explore',
        icon: lucide_react_1.Search,
        resource: 'investigations',
        action: 'read',
    },
    {
        name: 'Alerts',
        href: '/alerts',
        icon: lucide_react_1.AlertTriangle,
        badge: 3,
        resource: 'alerts',
        action: 'read',
    },
    {
        name: 'Cases',
        href: '/cases',
        icon: lucide_react_1.FileText,
        resource: 'cases',
        action: 'read',
    },
    {
        name: 'Command Center',
        href: '/dashboards/command-center',
        icon: lucide_react_1.BarChart3,
        resource: 'dashboards',
        action: 'read',
    },
    {
        name: 'Supply Chain',
        href: '/dashboards/supply-chain',
        icon: lucide_react_1.BarChart3,
        resource: 'dashboards',
        action: 'read',
    },
    {
        name: 'Usage & Cost',
        href: '/dashboards/usage-cost',
        icon: lucide_react_1.BarChart3,
        resource: 'dashboards',
        action: 'read',
    },
    {
        name: 'Internal Command',
        href: '/internal/command',
        icon: lucide_react_1.Command,
        resource: 'dashboards',
        action: 'read',
    },
    {
        name: 'PR Triage',
        href: '/pr-triage',
        icon: lucide_react_1.GitPullRequest,
        resource: 'dashboards',
        action: 'read',
    },
    {
        name: 'Data Sources',
        href: '/data/sources',
        icon: lucide_react_1.Database,
        resource: 'data',
        action: 'read',
    },
    {
        name: 'Models',
        href: '/models',
        icon: lucide_react_1.Brain,
        resource: 'models',
        action: 'read',
    },
    {
        name: 'Reports',
        href: '/reports',
        icon: lucide_react_1.FileBarChart,
        resource: 'reports',
        action: 'read',
    },
    {
        name: 'Admin',
        href: '/admin',
        icon: lucide_react_1.Settings,
        resource: 'admin',
        action: 'read',
    },
];
const supportItems = [
    { name: 'Help', href: '/help', icon: lucide_react_1.HelpCircle },
    { name: 'Changelog', href: '/changelog', icon: lucide_react_1.History },
];
// Optimization: Extracted component to avoid re-definition on every Navigation render.
// This prevents unnecessary unmounting/remounting of nav items and improves performance.
const NavItemComponent = ({ item, user }) => {
    const location = (0, react_router_dom_1.useLocation)();
    const { hasPermission } = (0, useRbac_1.useRbac)(item.resource || '', item.action || '', {
        user,
        fallback: !item.resource,
    });
    if (item.resource && !hasPermission) {
        return null;
    }
    const isActive = location.pathname === item.href ||
        (item.href !== '/' && location.pathname.startsWith(item.href));
    return (<Tooltip_1.Tooltip>
      <Tooltip_1.TooltipTrigger asChild>
        <react_router_dom_1.NavLink to={item.href} className={({ isActive: linkIsActive }) => (0, utils_1.cn)('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2', linkIsActive || isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground')} aria-current={location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))
            ? 'page'
            : undefined}>
          <item.icon className="h-4 w-4"/>
          <span className="flex-1">{item.name}</span>
          {item.badge && (<Badge_1.Badge variant="secondary" className="text-xs">
              {item.badge}
            </Badge_1.Badge>)}
        </react_router_dom_1.NavLink>
      </Tooltip_1.TooltipTrigger>
      <Tooltip_1.TooltipContent side="right">{item.name}</Tooltip_1.TooltipContent>
    </Tooltip_1.Tooltip>);
};
function Navigation({ user }) {
    const { logout } = (0, AuthContext_1.useAuth)();
    const { openSearch } = (0, SearchContext_1.useSearch)();
    return (<nav className="w-64 border-r bg-muted/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <react_router_dom_1.NavLink to="/" className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">
              IG
            </span>
          </div>
          <div className="font-semibold text-lg">IntelGraph</div>
        </react_router_dom_1.NavLink>
      </div>

      {/* Search Button */}
      <div className="p-4 border-b">
        <Button_1.Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={openSearch} aria-label="Search (Command+K)">
          <lucide_react_1.Command className="h-4 w-4 mr-2"/>
          Search...
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button_1.Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-4 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
          Intelligence
        </div>
        {navItems.slice(0, 3).map(item => (<NavItemComponent key={item.href} item={item} user={user}/>))}

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 mt-6">
          Dashboards
        </div>
        {navItems.slice(3, 7).map(item => (<NavItemComponent key={item.href} item={item} user={user}/>))}

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 mt-6">
          Platform
        </div>
        {navItems.slice(7).map(item => (<NavItemComponent key={item.href} item={item} user={user}/>))}
      </div>

      {/* Support & User */}
      <div className="p-4 border-t space-y-2">
        {supportItems.map(item => (<NavItemComponent key={item.href} item={item} user={user}/>))}

        {/* User Profile & Logout */}
        <div className="pt-4 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.role}
              </div>
            </div>
          </div>

          <Button_1.Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout} aria-label="Sign Out">
            <lucide_react_1.LogOut className="h-4 w-4 mr-2"/>
            Sign Out
          </Button_1.Button>
        </div>
      </div>
    </nav>);
}
