import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { registerForPush } from '../services/notifications';

type Props = {
  children: React.ReactNode;
};

export function AuthGate({ children }: Props): JSX.Element {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const attemptUnlock = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Summit Intelligence',
          fallbackLabel: 'Enter passcode'
        });
        if (!result.success) {
          setError(result.error ?? 'Authentication failed');
          setAuthenticated(false);
          return;
        }
      }
      await registerForPush();
      setAuthenticated(true);
    } catch (err) {
      setError((err as Error).message);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    attemptUnlock().catch(error => setError((error as Error).message));
  }, [attemptUnlock]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text>Validating access…</Text>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 12 }}>Secure access required</Text>
        {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
        <Button title="Retry" onPress={attemptUnlock} />
      </View>
    );
  }

  return <>{children}</>;
}
