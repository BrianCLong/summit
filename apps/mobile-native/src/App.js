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
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_native_paper_1 = require("react-native-paper");
const react_native_toast_message_1 = __importDefault(require("react-native-toast-message"));
const react_query_1 = require("@tanstack/react-query");
const react_2 = require("@apollo/client/react");
const GraphQLClient_1 = require("./services/GraphQLClient");
const AuthContext_1 = require("./contexts/AuthContext");
const OfflineContext_1 = require("./contexts/OfflineContext");
const LocationContext_1 = require("./contexts/LocationContext");
const AppNavigator_1 = require("./navigation/AppNavigator");
const theme_1 = require("./theme");
const AppInitializer_1 = require("./services/AppInitializer");
const ErrorBoundary_1 = require("./components/ErrorBoundary");
const SplashScreen_1 = require("./screens/SplashScreen");
// Ignore specific warnings
react_native_1.LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:',
]);
// Create React Query client
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 2,
            refetchOnWindowFocus: false,
            networkMode: 'offlineFirst',
        },
        mutations: {
            networkMode: 'offlineFirst',
        },
    },
});
const App = () => {
    const [isInitialized, setIsInitialized] = react_1.default.useState(false);
    (0, react_1.useEffect)(() => {
        const init = async () => {
            try {
                await (0, AppInitializer_1.initializeApp)();
                setIsInitialized(true);
            }
            catch (error) {
                console.error('Failed to initialize app:', error);
                // Show error toast or fallback UI
            }
        };
        init();
    }, []);
    if (!isInitialized) {
        return <SplashScreen_1.SplashScreen />;
    }
    return (<ErrorBoundary_1.ErrorBoundary>
      <react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
        <react_native_safe_area_context_1.SafeAreaProvider>
          <react_native_paper_1.PaperProvider theme={theme_1.theme}>
            <react_query_1.QueryClientProvider client={queryClient}>
              <react_2.ApolloProvider client={GraphQLClient_1.apolloClient}>
                <AuthContext_1.AuthProvider>
                  <OfflineContext_1.OfflineProvider>
                    <LocationContext_1.LocationProvider>
                      <react_native_1.StatusBar barStyle="dark-content"/>
                      <AppNavigator_1.AppNavigator />
                      <react_native_toast_message_1.default />
                    </LocationContext_1.LocationProvider>
                  </OfflineContext_1.OfflineProvider>
                </AuthContext_1.AuthProvider>
              </react_2.ApolloProvider>
            </react_query_1.QueryClientProvider>
          </react_native_paper_1.PaperProvider>
        </react_native_safe_area_context_1.SafeAreaProvider>
      </react_native_gesture_handler_1.GestureHandlerRootView>
    </ErrorBoundary_1.ErrorBoundary>);
};
exports.default = App;
