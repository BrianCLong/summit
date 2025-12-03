import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApolloProvider } from '@apollo/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapboxGL from '@rnmapbox/maps';

import { initializeApolloClient, getApolloClient } from '@/services/GraphQLClient';
import { initializeNotifications } from '@/services/NotificationService';
import { initializeSyncService } from '@/services/SyncService';
import { RootNavigator } from '@/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { MAP_CONFIG } from '@/config';
import { Text } from '@/components/ui';

import './src/global.css';

// Initialize Mapbox
MapboxGL.setAccessToken(MAP_CONFIG.mapboxAccessToken);

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [apolloClient, setApolloClient] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize Apollo Client
        const client = await initializeApolloClient();
        setApolloClient(client);

        // Initialize notifications
        await initializeNotifications();

        // Initialize sync service
        await initializeSyncService();

        setIsInitialized(true);
      } catch (error: any) {
        console.error('App initialization failed:', error);
        setInitError(error.message);
      }
    };

    initialize();
  }, []);

  if (initError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View className="flex-1 bg-dark-bg items-center justify-center px-8">
            <Text size="xl" weight="bold" variant="destructive">
              Initialization Error
            </Text>
            <Text variant="muted" className="mt-4 text-center">
              {initError}
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!isInitialized || !apolloClient) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View className="flex-1 bg-dark-bg items-center justify-center">
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text variant="muted" className="mt-4">
              Initializing IntelGraph...
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <StatusBar
                barStyle="light-content"
                backgroundColor="#0a0a0b"
                translucent
              />
              <RootNavigator />
            </ToastProvider>
          </QueryClientProvider>
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
