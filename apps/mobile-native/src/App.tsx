import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ApolloProvider} from '@apollo/client';

import {apolloClient} from './services/GraphQLClient';
import {AuthProvider} from './contexts/AuthContext';
import {OfflineProvider} from './contexts/OfflineContext';
import {LocationProvider} from './contexts/LocationContext';
import {AppNavigator} from './navigation/AppNavigator';
import {theme} from './theme';
import {initializeApp} from './services/AppInitializer';
import {ErrorBoundary} from './components/ErrorBoundary';
import {SplashScreen} from './screens/SplashScreen';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);

// Create React Query client
const queryClient = new QueryClient({
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

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Show error toast or fallback UI
      }
    };

    init();
  }, []);

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
              <ApolloProvider client={apolloClient}>
                <AuthProvider>
                  <OfflineProvider>
                    <LocationProvider>
                      <StatusBar barStyle="dark-content" />
                      <AppNavigator />
                      <Toast />
                    </LocationProvider>
                  </OfflineProvider>
                </AuthProvider>
              </ApolloProvider>
            </QueryClientProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
