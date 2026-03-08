"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainNavigator = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const bottom_tabs_1 = require("@react-navigation/bottom-tabs");
const lucide_react_native_1 = require("lucide-react-native");
const DashboardScreen_1 = require("@/screens/DashboardScreen");
const InvestigationsScreen_1 = require("@/screens/InvestigationsScreen");
const MapScreen_1 = require("@/screens/MapScreen");
const AlertsScreen_1 = require("@/screens/AlertsScreen");
const ui_1 = require("@/components/ui");
const Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
// Placeholder for More screen
const MoreScreen = () => (<react_native_1.View className="flex-1 bg-dark-bg items-center justify-center">
    <ui_1.Text>More Options</ui_1.Text>
  </react_native_1.View>);
const MainNavigator = () => {
    return (<Tab.Navigator screenOptions={{
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
        }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen_1.DashboardScreen} options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size }) => (<lucide_react_native_1.LayoutDashboard size={size} color={color}/>),
        }}/>
      <Tab.Screen name="Investigations" component={InvestigationsScreen_1.InvestigationsScreen} options={{
            tabBarLabel: 'Cases',
            tabBarIcon: ({ color, size }) => (<lucide_react_native_1.FileText size={size} color={color}/>),
        }}/>
      <Tab.Screen name="Map" component={MapScreen_1.MapScreen} options={{
            tabBarLabel: 'Map',
            tabBarIcon: ({ color, size }) => (<lucide_react_native_1.Map size={size} color={color}/>),
        }}/>
      <Tab.Screen name="Alerts" component={AlertsScreen_1.AlertsScreen} options={{
            tabBarLabel: 'Alerts',
            tabBarIcon: ({ color, size }) => (<lucide_react_native_1.Bell size={size} color={color}/>),
            tabBarBadge: undefined, // Can be set dynamically
        }}/>
      <Tab.Screen name="More" component={MoreScreen} options={{
            tabBarLabel: 'More',
            tabBarIcon: ({ color, size }) => (<lucide_react_native_1.Menu size={size} color={color}/>),
        }}/>
    </Tab.Navigator>);
};
exports.MainNavigator = MainNavigator;
