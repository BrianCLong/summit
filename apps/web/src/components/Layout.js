"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = Layout;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const Navigation_1 = require("./Navigation");
const GlobalSearch_1 = require("./GlobalSearch");
const AuthContext_1 = require("@/contexts/AuthContext");
const Skeleton_1 = require("@/components/ui/Skeleton");
const snapshots_1 = require("@/features/snapshots");
const GlobalStatusBanner_1 = require("@/features/internal-command/components/GlobalStatusBanner");
function Layout() {
    const { user, loading, isAuthenticated } = (0, AuthContext_1.useAuth)();
    if (loading) {
        return (<div className="h-screen flex">
        <div className="w-64 bg-muted">
          <Skeleton_1.Skeleton className="h-full"/>
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <Skeleton_1.Skeleton className="h-8 w-64"/>
            <Skeleton_1.Skeleton className="h-64 w-full"/>
            <Skeleton_1.Skeleton className="h-64 w-full"/>
          </div>
        </div>
      </div>);
    }
    if (!isAuthenticated) {
        return <react_router_dom_1.Navigate to="/signin" replace/>;
    }
    return (<div className="h-screen flex bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-0 focus:left-0 focus:p-4 focus:bg-background focus:text-primary focus:border focus:border-primary focus:shadow-lg focus:outline-none">
        Skip to main content
      </a>

      {/* Sidebar Navigation */}
      <Navigation_1.Navigation user={user}/>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">IntelGraph Platform</h1>
            </div>

            {/* Search trigger - actual search modal is rendered globally */}
            <div className="flex items-center gap-4">
              <snapshots_1.SnapshotMenu />
              <div className="text-sm text-muted-foreground">
                Welcome back, {user?.name}
              </div>
            </div>
          </div>
        </header>

        <GlobalStatusBanner_1.GlobalStatusBanner />

        {/* Page Content */}
        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          <react_router_dom_1.Outlet />
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch_1.GlobalSearch />
    </div>);
}
