import React from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {theme, typography} from '../theme';

export const SplashScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>IntelGraph</Text>
      <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      <Text style={styles.subtitle}>Loading intelligence platform...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    ...typography.h1,
    color: theme.colors.primary,
    marginBottom: 24,
  },
  loader: {
    marginBottom: 16,
  },
  subtitle: {
    ...typography.caption,
    color: theme.colors.onBackground,
  },
});
