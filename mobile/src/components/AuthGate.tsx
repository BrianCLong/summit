import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { registerForPush } from "../services/notifications";

type Props = {
  children: React.ReactNode;
};

export function AuthGate({ children }: Props): JSX.Element {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [canRetry, setCanRetry] = useState(true);

  const attemptUnlock = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Fail closed if no secure hardware is available
        // In production, this would fallback to a secure App PIN flow.
        setError("Device insecure: Biometric hardware missing or not enrolled.");
        setAuthenticated(false);
        setCanRetry(false); // No point retrying if hardware is missing
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Summit Intelligence",
        fallbackLabel: "Enter passcode",
        disableDeviceFallback: false, // Allow PIN fallback if biometrics fail
      });

      if (!result.success) {
        setError(result.error ?? "Authentication failed");
        setAuthenticated(false);
        setCanRetry(true);
        return;
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
    attemptUnlock().catch((error) => setError((error as Error).message));
  }, [attemptUnlock]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1221",
        }}
      >
        <ActivityIndicator size="large" color="#5AC8FA" />
        <Text style={{ marginTop: 20, color: "white" }}>Validating secure enclave...</Text>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#0B1221",
        }}
      >
        <Text style={{ fontWeight: "700", fontSize: 20, marginBottom: 12, color: "white" }}>
          Summit Mobile
        </Text>
        <Text style={{ fontWeight: "600", fontSize: 16, marginBottom: 12, color: "#9FB3D1" }}>
          Secure Field Kit Access Required
        </Text>
        {error ? (
          <Text style={{ color: "#FF6B6B", marginBottom: 12, textAlign: "center" }}>{error}</Text>
        ) : null}
        {canRetry && <Button title="Authenticate" onPress={attemptUnlock} color="#5AC8FA" />}
      </View>
    );
  }

  return <>{children}</>;
}
