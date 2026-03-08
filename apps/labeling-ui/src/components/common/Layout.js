"use strict";
// @ts-nocheck - React router type compatibility issue with @types/react version mismatch
/**
 * Layout Component
 *
 * Main application layout with navigation sidebar.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = Layout;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const cn_1 = require("../../utils/cn");
const labelingStore_1 = require("../../store/labelingStore");
const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: lucide_react_1.LayoutDashboard },
    { path: '/labeling', label: 'Labeling', icon: lucide_react_1.Tags },
    { path: '/review', label: 'Review', icon: lucide_react_1.CheckSquare },
    { path: '/datasets', label: 'Datasets', icon: lucide_react_1.Database },
    { path: '/quality', label: 'Quality', icon: lucide_react_1.BarChart3 },
];
function Layout() {
    const { userId, setUserId } = (0, labelingStore_1.useLabelingStore)();
    const [showUserMenu, setShowUserMenu] = react_1.default.useState(false);
    return (<div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <lucide_react_1.Tags className="h-6 w-6 text-primary"/>
            <span className="ml-2 text-lg font-semibold">Data Factory</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (<react_router_dom_1.NavLink key={item.path} to={item.path} className={({ isActive }) => (0, cn_1.cn)('flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                <item.icon className="mr-3 h-5 w-5"/>
                {item.label}
              </react_router_dom_1.NavLink>))}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <lucide_react_1.User className="mr-3 h-5 w-5"/>
                <span className="truncate">{userId}</span>
              </button>

              {showUserMenu && (<div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border bg-card p-4 shadow-lg">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    User ID
                  </label>
                  <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm"/>
                </div>)}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <react_router_dom_1.Outlet />
      </main>
    </div>);
}
