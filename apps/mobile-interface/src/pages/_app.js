"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Placeholder components compatibility
require("@/styles/globals.css");
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("react");
const react_hot_toast_1 = require("react-hot-toast");
const useAuth_1 = require("@/hooks/useAuth");
const useTheme_1 = require("@/hooks/useTheme");
const useOffline_1 = require("@/hooks/useOffline");
const useWebSocket_1 = require("@/hooks/useWebSocket");
const ErrorBoundary_1 = require("@/components/ErrorBoundary");
const LoadingSpinner_1 = require("@/components/LoadingSpinner");
const PWAPrompt_1 = require("@/components/PWAPrompt");
const head_1 = __importDefault(require("next/head"));
function MyApp({ Component, pageProps }) {
    const [queryClient] = (0, react_1.useState)(() => new react_query_1.QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                gcTime: 1000 * 60 * 30, // 30 minutes (renamed from cacheTime)
                retry: (failureCount, error) => {
                    const err = error;
                    if (err?.status === 404)
                        return false;
                    return failureCount < 3;
                },
                refetchOnWindowFocus: false,
            },
            mutations: {
                retry: 1,
            },
        },
    }));
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        // Simulate app initialization
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);
    if (isLoading) {
        return (<div className="min-h-screen bg-gradient-to-br from-primary-50 to-intel-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto bg-primary-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-intel-900 mb-2">IntelGraph</h1>
          <p className="text-intel-600 mb-8">Mobile Intelligence Platform</p>
          <LoadingSpinner_1.LoadingSpinner size="lg"/>
        </div>
      </div>);
    }
    return (<>
      <head_1.default>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
        <meta name="theme-color" content="#2563eb"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="apple-mobile-web-app-title" content="IntelGraph"/>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"/>
        <link rel="manifest" href="/manifest.json"/>
      </head_1.default>

      <ErrorBoundary_1.ErrorBoundary>
        <react_query_1.QueryClientProvider client={queryClient}>
          <useTheme_1.ThemeProvider>
            <useOffline_1.OfflineProvider>
              <useAuth_1.AuthProvider>
                <useWebSocket_1.WebSocketProvider>
                  <Component {...pageProps}/>
                  <react_hot_toast_1.Toaster position="top-center" toastOptions={{
            duration: 4000,
            style: {
                background: '#1f2937',
                color: '#f9fafb',
                fontSize: '14px',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            },
        }}/>
                  <PWAPrompt_1.PWAPrompt />
                </useWebSocket_1.WebSocketProvider>
              </useAuth_1.AuthProvider>
            </useOffline_1.OfflineProvider>
          </useTheme_1.ThemeProvider>
        </react_query_1.QueryClientProvider>
      </ErrorBoundary_1.ErrorBoundary>
    </>);
}
exports.default = MyApp;
