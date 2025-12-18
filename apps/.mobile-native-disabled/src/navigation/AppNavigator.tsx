import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuth} from '../hooks/useAuth';
import {AuthNavigator} from './AuthNavigator';
import {HomeScreen} from '../screens/HomeScreen';
import {SearchScreen} from '../screens/SearchScreen';
import {MapScreen} from '../screens/MapScreen';
import {CasesScreen} from '../screens/CasesScreen';
import {EntityDetailsScreen} from '../screens/EntityDetailsScreen';
import {CaseDetailsScreen} from '../screens/CaseDetailsScreen';
import {GraphScreen} from '../screens/GraphScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {CameraScreen} from '../screens/CameraScreen';
import {SyncStatusScreen} from '../screens/SyncStatusScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EntityDetails: {entityId: string};
  CaseDetails: {caseId: string};
  Graph: {entityId?: string; caseId?: string};
  Camera: {mode: 'photo' | 'video' | 'scan'};
  Notifications: undefined;
  Settings: undefined;
  SyncStatus: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Map: undefined;
  Cases: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'magnify' : 'magnify';
              break;
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Cases':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Cases" component={CasesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const {isAuthenticated, isLoading} = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="EntityDetails"
              component={EntityDetailsScreen}
              options={{headerShown: true, title: 'Entity Details'}}
            />
            <Stack.Screen
              name="CaseDetails"
              component={CaseDetailsScreen}
              options={{headerShown: true, title: 'Case Details'}}
            />
            <Stack.Screen
              name="Graph"
              component={GraphScreen}
              options={{headerShown: true, title: 'Graph View'}}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{headerShown: true, title: 'Notifications'}}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{headerShown: true, title: 'Settings'}}
            />
            <Stack.Screen
              name="SyncStatus"
              component={SyncStatusScreen}
              options={{headerShown: true, title: 'Sync Status'}}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
