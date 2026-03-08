"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthNavigator = void 0;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const stack_1 = require("@react-navigation/stack");
const LoginScreen_1 = require("../screens/auth/LoginScreen");
const BiometricLoginScreen_1 = require("../screens/auth/BiometricLoginScreen");
const PINSetupScreen_1 = require("../screens/auth/PINSetupScreen");
const MFAScreen_1 = require("../screens/auth/MFAScreen");
const Stack = (0, stack_1.createStackNavigator)();
const AuthNavigator = () => {
    return (<Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen_1.LoginScreen}/>
      <Stack.Screen name="BiometricLogin" component={BiometricLoginScreen_1.BiometricLoginScreen}/>
      <Stack.Screen name="PINSetup" component={PINSetupScreen_1.PINSetupScreen}/>
      <Stack.Screen name="MFA" component={MFAScreen_1.MFAScreen}/>
    </Stack.Navigator>);
};
exports.AuthNavigator = AuthNavigator;
