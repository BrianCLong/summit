"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppNavigator = void 0;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const native_1 = require("@react-navigation/native");
const stack_1 = require("@react-navigation/stack");
const bottom_tabs_1 = require("@react-navigation/bottom-tabs");
const drawer_1 = require("@react-navigation/drawer");
const MaterialCommunityIcons_1 = __importDefault(require("react-native-vector-icons/MaterialCommunityIcons"));
const useAuth_1 = require("../hooks/useAuth");
const AuthNavigator_1 = require("./AuthNavigator");
const HomeScreen_1 = require("../screens/HomeScreen");
const SearchScreen_1 = require("../screens/SearchScreen");
const MapScreen_1 = require("../screens/MapScreen");
const CasesScreen_1 = require("../screens/CasesScreen");
const EntityDetailsScreen_1 = require("../screens/EntityDetailsScreen");
const CaseDetailsScreen_1 = require("../screens/CaseDetailsScreen");
const GraphScreen_1 = require("../screens/GraphScreen");
const ProfileScreen_1 = require("../screens/ProfileScreen");
const SettingsScreen_1 = require("../screens/SettingsScreen");
const NotificationsScreen_1 = require("../screens/NotificationsScreen");
const CameraScreen_1 = require("../screens/CameraScreen");
const SyncStatusScreen_1 = require("../screens/SyncStatusScreen");
const Stack = (0, stack_1.createStackNavigator)();
const Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
const Drawer = (0, drawer_1.createDrawerNavigator)();
const MainTabs = () => {
    return (<Tab.Navigator screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;
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
                return <MaterialCommunityIcons_1.default name={iconName} size={size} color={color}/>;
            },
            tabBarActiveTintColor: '#2563eb',
            tabBarInactiveTintColor: 'gray',
            headerShown: true,
        })}>
      <Tab.Screen name="Home" component={HomeScreen_1.HomeScreen}/>
      <Tab.Screen name="Search" component={SearchScreen_1.SearchScreen}/>
      <Tab.Screen name="Map" component={MapScreen_1.MapScreen}/>
      <Tab.Screen name="Cases" component={CasesScreen_1.CasesScreen}/>
      <Tab.Screen name="Profile" component={ProfileScreen_1.ProfileScreen}/>
    </Tab.Navigator>);
};
const AppNavigator = () => {
    const { isAuthenticated, isLoading } = (0, useAuth_1.useAuth)();
    if (isLoading) {
        return null; // Or a loading screen
    }
    return (<native_1.NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (<Stack.Screen name="Auth" component={AuthNavigator_1.AuthNavigator}/>) : (<>
            <Stack.Screen name="Main" component={MainTabs}/>
            <Stack.Screen name="EntityDetails" component={EntityDetailsScreen_1.EntityDetailsScreen} options={{ headerShown: true, title: 'Entity Details' }}/>
            <Stack.Screen name="CaseDetails" component={CaseDetailsScreen_1.CaseDetailsScreen} options={{ headerShown: true, title: 'Case Details' }}/>
            <Stack.Screen name="Graph" component={GraphScreen_1.GraphScreen} options={{ headerShown: true, title: 'Graph View' }}/>
            <Stack.Screen name="Camera" component={CameraScreen_1.CameraScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="Notifications" component={NotificationsScreen_1.NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }}/>
            <Stack.Screen name="Settings" component={SettingsScreen_1.SettingsScreen} options={{ headerShown: true, title: 'Settings' }}/>
            <Stack.Screen name="SyncStatus" component={SyncStatusScreen_1.SyncStatusScreen} options={{ headerShown: true, title: 'Sync Status' }}/>
          </>)}
      </Stack.Navigator>
    </native_1.NavigationContainer>);
};
exports.AppNavigator = AppNavigator;
