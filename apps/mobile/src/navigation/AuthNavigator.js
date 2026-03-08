"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthNavigator = void 0;
const react_1 = __importDefault(require("react"));
const native_stack_1 = require("@react-navigation/native-stack");
const LoginScreen_1 = require("@/screens/LoginScreen");
const Stack = (0, native_stack_1.createNativeStackNavigator)();
const AuthNavigator = () => {
    return (<Stack.Navigator screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0a0b' },
        }}>
      <Stack.Screen name="Login" component={LoginScreen_1.LoginScreen}/>
    </Stack.Navigator>);
};
exports.AuthNavigator = AuthNavigator;
