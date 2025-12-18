import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppStore } from '@/stores/appStore';
import type { RootStackParamList } from '@/types';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { EntityDetailsScreen } from '@/screens/EntityDetailsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0b' },
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="EntityDetails"
              component={EntityDetailsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
