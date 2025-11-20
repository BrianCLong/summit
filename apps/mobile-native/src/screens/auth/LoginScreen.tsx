import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {login, loginWithBiometric, isBiometricEnabled} from '../../services/AuthService';
import {useAuth} from '../../hooks/useAuth';
import {theme, spacing, typography, shadows} from '../../theme';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const {login: setUser} = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const available = await isBiometricEnabled();
    setBiometricAvailable(available);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await login({email, password});

      if (response.mfaRequired) {
        navigation.navigate('MFA' as never, {sessionToken: response.sessionToken} as never);
      } else {
        setUser(response.user);
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const user = await loginWithBiometric();
      if (user) {
        setUser(user);
      } else {
        Alert.alert('Authentication Failed', 'Biometric authentication was not successful');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Icon name="graph" size={80} color={theme.colors.primary} />
          <Text style={styles.title}>IntelGraph</Text>
          <Text style={styles.subtitle}>Intelligence Analysis Platform</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Icon name="email-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.outline}
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="login" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Biometric Login */}
          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={loading}>
              <Icon name="fingerprint" size={24} color={theme.colors.primary} />
              <Text style={styles.biometricText}>Sign in with biometrics</Text>
            </TouchableOpacity>
          )}

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: theme.colors.primary,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.caption,
    color: theme.colors.outline,
    marginTop: spacing.xs,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 56,
    ...typography.body,
    color: theme.colors.onSurface,
  },
  eyeIcon: {
    padding: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  biometricText: {
    ...typography.body,
    color: theme.colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotPasswordText: {
    ...typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: spacing.lg,
  },
  footerText: {
    ...typography.small,
    color: theme.colors.outline,
    textAlign: 'center',
    lineHeight: 18,
  },
});
