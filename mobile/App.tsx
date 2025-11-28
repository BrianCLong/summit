import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import VoiceNotesScreen from './src/screens/VoiceNotesScreen';
import { AuthGate } from './src/components/AuthGate';
import { SyncProvider } from './src/services/SyncProvider';

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
