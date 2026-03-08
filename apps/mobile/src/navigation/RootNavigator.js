"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootNavigator = void 0;
const react_1 = __importDefault(require("react"));
const native_1 = require("@react-navigation/native");
const native_stack_1 = require("@react-navigation/native-stack");
const appStore_1 = require("@/stores/appStore");
const AuthNavigator_1 = require("./AuthNavigator");
const MainNavigator_1 = require("./MainNavigator");
const EntityDetailsScreen_1 = require("@/screens/EntityDetailsScreen");
const Stack = (0, native_stack_1.createNativeStackNavigator)();
const RootNavigator = () => {
    const { isAuthenticated } = (0, appStore_1.useAppStore)();
    return (<native_1.NavigationContainer>
      <Stack.Navigator screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0a0b' },
            animation: 'slide_from_right',
        }}>
        {isAuthenticated ? (<>
            <Stack.Screen name="Main" component={MainNavigator_1.MainNavigator}/>
            <Stack.Screen name="EntityDetails" component={EntityDetailsScreen_1.EntityDetailsScreen} options={{ animation: 'slide_from_bottom' }}/>
          </>) : (<Stack.Screen name="Auth" component={AuthNavigator_1.AuthNavigator}/>)}
      </Stack.Navigator>
    </native_1.NavigationContainer>);
};
exports.RootNavigator = RootNavigator;
