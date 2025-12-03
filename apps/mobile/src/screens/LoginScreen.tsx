import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Fingerprint, Scan, Shield } from 'lucide-react-native';

import { login, isBiometricsAvailable, authenticateWithBiometrics, isBiometricEnabled } from '@/services/AuthService';
import { useAppStore } from '@/stores/appStore';
import {
  Text,
  Input,
  Button,
  Card,
  CardContent,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setUser, setAuthenticated } = useAppStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Check biometrics availability
  React.useEffect(() => {
    const checkBiometrics = async () => {
      const available = await isBiometricsAvailable();
      const enabled = isBiometricEnabled();
      setBiometricsAvailable(available && enabled);
    };
    checkBiometrics();
  }, []);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const user = await login(data);
      setUser(user);
      setAuthenticated(true);
      toast({
        type: 'success',
        title: 'Welcome back!',
        description: `Signed in as ${user.name}`,
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Login failed',
        description: error.message || 'Please check your credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      // In a real app, you'd retrieve stored credentials or token
      toast({
        type: 'success',
        title: 'Authenticated',
        description: 'Biometric authentication successful',
      });
    } else {
      toast({
        type: 'error',
        title: 'Authentication failed',
        description: 'Biometric authentication was not successful',
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Header */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-intel-600 rounded-2xl items-center justify-center mb-4">
              <Shield size={40} color="#fff" />
            </View>
            <Text size="3xl" weight="bold">
              IntelGraph
            </Text>
            <Text variant="muted" className="mt-2">
              Intelligence Analysis Platform
            </Text>
          </View>

          {/* Login Form */}
          <Card>
            <CardContent className="py-6">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    placeholder="analyst@agency.gov"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    containerClassName="mb-4"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    secureTextEntry
                    autoComplete="password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    containerClassName="mb-6"
                  />
                )}
              />

              <Button
                onPress={handleSubmit(handleLogin)}
                loading={isLoading}
                className="mb-4"
              >
                Sign In
              </Button>

              {/* Biometric Login */}
              {biometricsAvailable && (
                <Button
                  variant="outline"
                  onPress={handleBiometricLogin}
                  leftIcon={<Fingerprint size={20} color="#0ea5e9" />}
                >
                  Sign in with Biometrics
                </Button>
              )}

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                className="mt-4"
              >
                <Text size="sm" variant="primary" className="text-center">
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <View className="mt-8 px-4">
            <View className="flex-row items-start">
              <Shield size={16} color="#71717a" />
              <Text size="xs" variant="muted" className="ml-2 flex-1">
                This is a secure government system. Unauthorized access is prohibited
                and may be subject to criminal prosecution.
              </Text>
            </View>
          </View>

          {/* SSO Options */}
          <View className="mt-6">
            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-px bg-dark-border" />
              <Text size="sm" variant="muted" className="mx-4">
                or continue with
              </Text>
              <View className="flex-1 h-px bg-dark-border" />
            </View>

            <Button
              variant="secondary"
              leftIcon={<Scan size={18} color="#fff" />}
            >
              CAC / PIV Card
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
