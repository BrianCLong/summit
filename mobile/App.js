"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
// Polyfill for random values if not present
require("react-native-get-random-values");
const react_1 = __importDefault(require("react"));
const native_1 = require("@react-navigation/native");
const native_stack_1 = require("@react-navigation/native-stack");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const DashboardScreen_1 = __importDefault(require("./src/screens/DashboardScreen"));
const CaptureScreen_1 = __importDefault(require("./src/screens/CaptureScreen"));
const DocumentsScreen_1 = __importDefault(require("./src/screens/DocumentsScreen"));
const VoiceNotesScreen_1 = __importDefault(require("./src/screens/VoiceNotesScreen"));
const AuthGate_1 = require("./src/components/AuthGate");
const SyncProvider_1 = require("./src/services/SyncProvider");
// Verify environment security on boot
if (!global.crypto || !global.crypto.getRandomValues) {
    if (__DEV__) {
        console.warn('WARN: Secure random source missing. Encryption will fail unless polyfilled.');
    }
    else {
        // Crash in production if security dependencies are missing
        throw new Error('CRITICAL: Secure environment check failed. Missing crypto polyfill.');
    }
}
const Stack = (0, native_stack_1.createNativeStackNavigator)();
function App() {
    return (<react_native_safe_area_context_1.SafeAreaProvider>
      <native_1.NavigationContainer>
        <AuthGate_1.AuthGate>
          <SyncProvider_1.SyncProvider>
            <Stack.Navigator initialRouteName="Dashboard">
              <Stack.Screen name="Dashboard" component={DashboardScreen_1.default}/>
              <Stack.Screen name="Capture" component={CaptureScreen_1.default}/>
              <Stack.Screen name="Documents" component={DocumentsScreen_1.default}/>
              <Stack.Screen name="Voice" component={VoiceNotesScreen_1.default}/>
            </Stack.Navigator>
          </SyncProvider_1.SyncProvider>
        </AuthGate_1.AuthGate>
      </native_1.NavigationContainer>
    </react_native_safe_area_context_1.SafeAreaProvider>);
}
