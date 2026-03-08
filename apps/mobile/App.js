"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const client_1 = require("@apollo/client");
const react_query_1 = require("@tanstack/react-query");
const maps_1 = __importDefault(require("@rnmapbox/maps"));
const GraphQLClient_1 = require("@/services/GraphQLClient");
const NotificationService_1 = require("@/services/NotificationService");
const SyncService_1 = require("@/services/SyncService");
const navigation_1 = require("@/navigation");
const Toast_1 = require("@/components/ui/Toast");
const config_1 = require("@/config");
const ui_1 = require("@/components/ui");
require("./src/global.css");
// Initialize Mapbox
maps_1.default.setAccessToken(config_1.MAP_CONFIG.mapboxAccessToken);
// Create React Query client
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});
const App = () => {
    const [isInitialized, setIsInitialized] = (0, react_1.useState)(false);
    const [apolloClient, setApolloClient] = (0, react_1.useState)(null);
    const [initError, setInitError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const initialize = async () => {
            try {
                // Initialize Apollo Client
                const client = await (0, GraphQLClient_1.initializeApolloClient)();
                setApolloClient(client);
                // Initialize notifications
                await (0, NotificationService_1.initializeNotifications)();
                // Initialize sync service
                await (0, SyncService_1.initializeSyncService)();
                setIsInitialized(true);
            }
            catch (error) {
                console.error('App initialization failed:', error);
                setInitError(error.message);
            }
        };
        initialize();
    }, []);
    if (initError) {
        return (<react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
        <react_native_safe_area_context_1.SafeAreaProvider>
          <react_native_1.View className="flex-1 bg-dark-bg items-center justify-center px-8">
            <ui_1.Text size="xl" weight="bold" variant="destructive">
              Initialization Error
            </ui_1.Text>
            <ui_1.Text variant="muted" className="mt-4 text-center">
              {initError}
            </ui_1.Text>
          </react_native_1.View>
        </react_native_safe_area_context_1.SafeAreaProvider>
      </react_native_gesture_handler_1.GestureHandlerRootView>);
    }
    if (!isInitialized || !apolloClient) {
        return (<react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
        <react_native_safe_area_context_1.SafeAreaProvider>
          <react_native_1.View className="flex-1 bg-dark-bg items-center justify-center">
            <react_native_1.ActivityIndicator size="large" color="#0ea5e9"/>
            <ui_1.Text variant="muted" className="mt-4">
              Initializing IntelGraph...
            </ui_1.Text>
          </react_native_1.View>
        </react_native_safe_area_context_1.SafeAreaProvider>
      </react_native_gesture_handler_1.GestureHandlerRootView>);
    }
    return (<react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
      <react_native_safe_area_context_1.SafeAreaProvider>
        <client_1.ApolloProvider client={apolloClient}>
          <react_query_1.QueryClientProvider client={queryClient}>
            <Toast_1.ToastProvider>
              <react_native_1.StatusBar barStyle="light-content" backgroundColor="#0a0a0b" translucent/>
              <navigation_1.RootNavigator />
            </Toast_1.ToastProvider>
          </react_query_1.QueryClientProvider>
        </client_1.ApolloProvider>
      </react_native_safe_area_context_1.SafeAreaProvider>
    </react_native_gesture_handler_1.GestureHandlerRootView>);
};
exports.default = App;
