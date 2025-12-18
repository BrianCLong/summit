import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';

import {LoginScreen} from '../screens/auth/LoginScreen';
import {BiometricLoginScreen} from '../screens/auth/BiometricLoginScreen';
import {PINSetupScreen} from '../screens/auth/PINSetupScreen';
import {MFAScreen} from '../screens/auth/MFAScreen';

export type AuthStackParamList = {
  Login: undefined;
  BiometricLogin: undefined;
  PINSetup: undefined;
  MFA: {sessionToken: string};
};

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="BiometricLogin" component={BiometricLoginScreen} />
      <Stack.Screen name="PINSetup" component={PINSetupScreen} />
      <Stack.Screen name="MFA" component={MFAScreen} />
    </Stack.Navigator>
  );
};
