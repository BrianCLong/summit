// Polyfill for random values if not present
import "react-native-get-random-values";

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import DashboardScreen from "./src/screens/DashboardScreen";
import CaptureScreen from "./src/screens/CaptureScreen";
import DocumentsScreen from "./src/screens/DocumentsScreen";
import VoiceNotesScreen from "./src/screens/VoiceNotesScreen";
import { AuthGate } from "./src/components/AuthGate";
import { SyncProvider } from "./src/services/SyncProvider";

// Verify environment security on boot
if (!global.crypto || !global.crypto.getRandomValues) {
  if (__DEV__) {
    console.warn("WARN: Secure random source missing. Encryption will fail unless polyfilled.");
  } else {
    // Crash in production if security dependencies are missing
    throw new Error("CRITICAL: Secure environment check failed. Missing crypto polyfill.");
  }
}

const Stack = createNativeStackNavigator();

export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthGate>
          <SyncProvider>
            <Stack.Navigator initialRouteName="Dashboard">
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Capture" component={CaptureScreen} />
              <Stack.Screen name="Documents" component={DocumentsScreen} />
              <Stack.Screen name="Voice" component={VoiceNotesScreen} />
            </Stack.Navigator>
          </SyncProvider>
        </AuthGate>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
