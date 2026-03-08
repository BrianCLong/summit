"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Placeholder components compatibility
const react_1 = require("react");
const head_1 = __importDefault(require("next/head"));
const MobileLayout_1 = require("@/components/layouts/MobileLayout");
const SearchBar_1 = require("@/components/SearchBar");
const QuickActions_1 = require("@/components/QuickActions");
const RecentActivity_1 = require("@/components/RecentActivity");
const AlertsPanel_1 = require("@/components/AlertsPanel");
const WeatherWidget_1 = require("@/components/WeatherWidget");
const StatusIndicator_1 = require("@/components/StatusIndicator");
const useAuth_1 = require("@/hooks/useAuth");
const useOffline_1 = require("@/hooks/useOffline");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/services/api");
const framer_motion_1 = require("framer-motion");
const HomePage = () => {
    const { user } = (0, useAuth_1.useAuth)();
    const { isOffline } = (0, useOffline_1.useOffline)();
    const [greeting, setGreeting] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        const hour = new Date().getHours();
        if (hour < 12)
            setGreeting('Good morning');
        else if (hour < 18)
            setGreeting('Good afternoon');
        else
            setGreeting('Good evening');
    }, []);
    const { data: dashboardData, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['dashboard', user?.id],
        queryFn: () => api_1.apiClient.getDashboardData(),
        enabled: !!user && !isOffline,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
            },
        },
    };
    return (<>
      <head_1.default>
        <title>IntelGraph Mobile - Intelligence Dashboard</title>
        <meta name="description" content="Mobile intelligence analysis platform"/>
      </head_1.default>

      <MobileLayout_1.MobileLayout>
        <framer_motion_1.motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
          {/* Header Section */}
          <framer_motion_1.motion.div variants={itemVariants} className="bg-white dark:bg-intel-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-intel-900 dark:text-white">
                  {greeting}, {user?.firstName || 'Analyst'}
                </h1>
                <p className="text-intel-600 dark:text-intel-400 mt-1">
                  {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <StatusIndicator_1.StatusIndicator status={isOffline ? 'offline' : 'online'} label={isOffline ? 'Offline' : 'Online'}/>
                <WeatherWidget_1.WeatherWidget />
              </div>
            </div>

            {/* Search Bar */}
            <SearchBar_1.SearchBar placeholder="Search entities, cases, or intelligence..." onSearch={(query) => console.log('Search:', query)} showVoiceSearch showQRScanner/>
          </framer_motion_1.motion.div>

          {/* Alerts Panel */}
          <framer_motion_1.motion.div variants={itemVariants}>
            <AlertsPanel_1.AlertsPanel alerts={dashboardData?.alerts || []} isLoading={isLoading}/>
          </framer_motion_1.motion.div>

          {/* Quick Actions */}
          <framer_motion_1.motion.div variants={itemVariants}>
            <QuickActions_1.QuickActions actions={[
            {
                id: 'new-case',
                title: 'New Case',
                description: 'Create a new investigation case',
                icon: 'FolderPlusIcon',
                color: 'primary',
                href: '/cases/new',
            },
            {
                id: 'scan-document',
                title: 'Scan Document',
                description: 'OCR and analyze documents',
                icon: 'DocumentScannerIcon',
                color: 'success',
                action: 'scan',
            },
            {
                id: 'voice-note',
                title: 'Voice Note',
                description: 'Record voice observations',
                icon: 'MicrophoneIcon',
                color: 'warning',
                action: 'record',
            },
            {
                id: 'geolocation',
                title: 'Mark Location',
                description: 'Tag current location',
                icon: 'MapPinIcon',
                color: 'intel',
                action: 'location',
            },
            {
                id: 'emergency',
                title: 'Emergency',
                description: 'Quick emergency protocols',
                icon: 'ExclamationTriangleIcon',
                color: 'danger',
                action: 'emergency',
            },
            {
                id: 'sync',
                title: 'Sync Data',
                description: 'Synchronize offline data',
                icon: 'ArrowPathIcon',
                color: 'primary',
                action: 'sync',
                disabled: !isOffline,
            },
        ]}/>
          </framer_motion_1.motion.div>

          {/* Recent Activity */}
          <framer_motion_1.motion.div variants={itemVariants}>
            <RecentActivity_1.RecentActivity activities={dashboardData?.recentActivity || []} isLoading={isLoading}/>
          </framer_motion_1.motion.div>

          {/* Statistics Grid */}
          <framer_motion_1.motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.activeCases || '0'}
              </div>
              <div className="text-primary-100 text-sm">Active Cases</div>
            </div>
            <div className="bg-gradient-to-r from-success-500 to-success-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.resolvedCases || '0'}
              </div>
              <div className="text-success-100 text-sm">Resolved Cases</div>
            </div>
            <div className="bg-gradient-to-r from-warning-500 to-warning-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.pendingAlerts || '0'}
              </div>
              <div className="text-warning-100 text-sm">Pending Alerts</div>
            </div>
            <div className="bg-gradient-to-r from-intel-500 to-intel-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.totalEntities || '0'}
              </div>
              <div className="text-intel-100 text-sm">Total Entities</div>
            </div>
          </framer_motion_1.motion.div>

          {/* Offline Indicator */}
          {isOffline && (<framer_motion_1.motion.div variants={itemVariants} className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-warning-800 dark:text-warning-200 font-medium">
                    Working Offline
                  </p>
                  <p className="text-warning-600 dark:text-warning-400 text-sm">
                    Your data will sync when connection is restored
                  </p>
                </div>
              </div>
            </framer_motion_1.motion.div>)}
        </framer_motion_1.motion.div>
      </MobileLayout_1.MobileLayout>
    </>);
};
exports.default = HomePage;
