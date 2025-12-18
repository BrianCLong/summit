import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  FileText,
  Map,
  Bell,
  Menu,
} from 'lucide-react-native';

import type { MainTabParamList } from '@/types';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { InvestigationsScreen } from '@/screens/InvestigationsScreen';
import { MapScreen } from '@/screens/MapScreen';
import { AlertsScreen } from '@/screens/AlertsScreen';
import { Text } from '@/components/ui';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder for More screen
const MoreScreen = () => (
  <View className="flex-1 bg-dark-bg items-center justify-center">
    <Text>More Options</Text>
  </View>
);

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#141415',
          borderTopColor: '#27272a',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Investigations"
        component={InvestigationsScreen}
        options={{
          tabBarLabel: 'Cases',
          tabBarIcon: ({ color, size }) => (
            <FileText size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Map size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} />
          ),
          tabBarBadge: undefined, // Can be set dynamically
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Menu size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
