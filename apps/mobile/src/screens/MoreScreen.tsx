import React, { useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Settings,
  Bell,
  Shield,
  Database,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Wifi,
  Info,
} from 'lucide-react-native';

import { useAppStore } from '@/stores/appStore';
import { Text, Card, CardContent, Switch, Badge } from '@/components/ui';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  label,
  description,
  onPress,
  rightElement,
  showChevron = true,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    className="flex-row items-center py-4 px-4 border-b border-dark-border"
    activeOpacity={0.7}
  >
    <View className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center mr-3">
      {icon}
    </View>
    <View className="flex-1">
      <Text weight="medium">{label}</Text>
      {description && (
        <Text size="sm" variant="muted">
          {description}
        </Text>
      )}
    </View>
    {rightElement}
    {showChevron && onPress && <ChevronRight size={20} color="#71717a" />}
  </TouchableOpacity>
);

export const MoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout, syncStatus, preferences, setPreferences } = useAppStore();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  }, [logout]);

  const handleDarkModeToggle = useCallback((enabled: boolean) => {
    setPreferences({
      ...preferences,
      theme: enabled ? 'dark' : 'light',
    });
  }, [preferences, setPreferences]);

  const handleNotificationsToggle = useCallback((enabled: boolean) => {
    setPreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        alerts: enabled,
      },
    });
  }, [preferences, setPreferences]);

  const handleOfflineModeToggle = useCallback((enabled: boolean) => {
    setPreferences({
      ...preferences,
      offlineSettings: {
        ...preferences.offlineSettings,
        autoSync: !enabled,
      },
    });
  }, [preferences, setPreferences]);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView>
        {/* Header */}
        <View className="px-4 py-4 border-b border-dark-border">
          <Text size="xl" weight="bold">
            Settings
          </Text>
        </View>

        {/* Sync Status */}
        <View className="px-4 py-3 bg-dark-surface border-b border-dark-border">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Database size={16} color="#71717a" />
              <Text size="sm" variant="muted" className="ml-2">
                {syncStatus.offlineMode ? 'Offline Mode' : 'Connected'}
              </Text>
            </View>
            {syncStatus.pendingChanges > 0 && (
              <Badge variant="warning" size="sm">
                {syncStatus.pendingChanges} pending
              </Badge>
            )}
          </View>
        </View>

        {/* Account Section */}
        <View className="mt-4">
          <Text size="sm" weight="medium" variant="muted" className="px-4 mb-2">
            ACCOUNT
          </Text>
          <Card className="mx-0 rounded-none">
            <SettingsItem
              icon={<User size={20} color="#0ea5e9" />}
              label="Profile"
              description="Manage your account details"
              onPress={() => navigation.navigate('Profile')}
            />
            <SettingsItem
              icon={<Shield size={20} color="#0ea5e9" />}
              label="Security"
              description="PIN, biometrics, and session"
              onPress={() => navigation.navigate('Settings')}
            />
          </Card>
        </View>

        {/* Preferences Section */}
        <View className="mt-6">
          <Text size="sm" weight="medium" variant="muted" className="px-4 mb-2">
            PREFERENCES
          </Text>
          <Card className="mx-0 rounded-none">
            <SettingsItem
              icon={<Moon size={20} color="#0ea5e9" />}
              label="Dark Mode"
              description="Always use dark theme"
              showChevron={false}
              rightElement={
                <Switch
                  value={preferences.theme === 'dark'}
                  onValueChange={handleDarkModeToggle}
                />
              }
            />
            <SettingsItem
              icon={<Bell size={20} color="#0ea5e9" />}
              label="Notifications"
              description="Push alerts and updates"
              showChevron={false}
              rightElement={
                <Switch
                  value={preferences.notifications.alerts}
                  onValueChange={handleNotificationsToggle}
                />
              }
            />
            <SettingsItem
              icon={<Wifi size={20} color="#0ea5e9" />}
              label="Offline Mode"
              description="Work without network connection"
              showChevron={false}
              rightElement={
                <Switch
                  value={!preferences.offlineSettings.autoSync}
                  onValueChange={handleOfflineModeToggle}
                />
              }
            />
          </Card>
        </View>

        {/* Support Section */}
        <View className="mt-6">
          <Text size="sm" weight="medium" variant="muted" className="px-4 mb-2">
            SUPPORT
          </Text>
          <Card className="mx-0 rounded-none">
            <SettingsItem
              icon={<HelpCircle size={20} color="#0ea5e9" />}
              label="Help & Documentation"
              description="User guides and FAQs"
              onPress={() => {}}
            />
            <SettingsItem
              icon={<Info size={20} color="#0ea5e9" />}
              label="About"
              description="Version 1.0.0 (GA)"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Sign Out */}
        <View className="mt-6 mb-8">
          <Card className="mx-0 rounded-none">
            <SettingsItem
              icon={<LogOut size={20} color="#ef4444" />}
              label="Sign Out"
              onPress={handleLogout}
              showChevron={false}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
