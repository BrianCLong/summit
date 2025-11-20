/**
 * Shared UI Components for IntelGraph Mobile
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme, spacing, typography, shadows} from '../theme';

// Button Component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
    fullWidth && styles.buttonFullWidth,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`buttonText${size.charAt(0).toUpperCase() + size.slice(1)}`],
  ];

  return (
    <TouchableOpacity style={buttonStyles} onPress={onPress} disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#fff' : theme.colors.primary}
          size={size === 'small' ? 'small' : 'large'}
        />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={size === 'small' ? 16 : 20}
              color={variant === 'primary' ? '#fff' : theme.colors.primary}
              style={styles.buttonIcon}
            />
          )}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({children, style, onPress}) => {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component style={[styles.card, style]} onPress={onPress}>
      {children}
    </Component>
  );
};

// Badge Component
interface BadgeProps {
  label: string;
  color?: string;
  variant?: 'filled' | 'outlined';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = theme.colors.primary,
  variant = 'filled',
  style,
}) => {
  return (
    <View
      style={[
        styles.badge,
        variant === 'filled'
          ? {backgroundColor: color}
          : {borderWidth: 1, borderColor: color, backgroundColor: 'transparent'},
        style,
      ]}>
      <Text
        style={[
          styles.badgeText,
          {color: variant === 'filled' ? '#fff' : color},
        ]}>
        {label}
      </Text>
    </View>
  );
};

// Avatar Component
interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({name, imageUri, size = 40, style}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.avatar, {width: size, height: size, borderRadius: size / 2}, style]}>
      {imageUri ? (
        // TODO: Add Image component
        <Text style={[styles.avatarText, {fontSize: size / 2.5}]}>{initials}</Text>
      ) : (
        <Text style={[styles.avatarText, {fontSize: size / 2.5}]}>{initials}</Text>
      )}
    </View>
  );
};

// Divider Component
interface DividerProps {
  style?: ViewStyle;
  thickness?: number;
}

export const Divider: React.FC<DividerProps> = ({style, thickness = 1}) => {
  return <View style={[styles.divider, {height: thickness}, style]} />;
};

// Empty State Component
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({icon, title, description, action}) => {
  return (
    <View style={styles.emptyState}>
      {icon && <Icon name={icon} size={64} color={theme.colors.outline} />}
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {description && <Text style={styles.emptyStateDescription}>{description}</Text>}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );
};

// Loading Component
interface LoadingProps {
  size?: 'small' | 'large';
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({size = 'large', text}) => {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {text && <Text style={styles.loadingText}>{text}</Text>}
    </View>
  );
};

// Chip Component
interface ChipProps {
  label: string;
  icon?: string;
  onPress?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  onPress,
  onDelete,
  selected = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected, style]}
      onPress={onPress}
      disabled={!onPress}>
      {icon && (
        <Icon
          name={icon}
          size={16}
          color={selected ? theme.colors.primary : theme.colors.outline}
          style={styles.chipIcon}
        />
      )}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.chipDelete}>
          <Icon name="close-circle" size={16} color={theme.colors.outline} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// StatusIndicator Component
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'syncing' | 'error';
  size?: number;
  showLabel?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 8,
  showLabel = false,
}) => {
  const colors = {
    online: '#10b981',
    offline: '#6b7280',
    syncing: '#f59e0b',
    error: '#ef4444',
  };

  const labels = {
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing',
    error: 'Error',
  };

  return (
    <View style={styles.statusIndicator}>
      <View
        style={[
          styles.statusDot,
          {width: size, height: size, borderRadius: size / 2, backgroundColor: colors[status]},
        ]}
      />
      {showLabel && <Text style={styles.statusLabel}>{labels[status]}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  // Button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    ...shadows.medium,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surface,
    ...shadows.small,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  buttonSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonMedium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  buttonLarge: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  buttonTextSecondary: {
    color: theme.colors.onSurface,
  },
  buttonTextOutline: {
    color: theme.colors.primary,
  },
  buttonTextText: {
    color: theme.colors.primary,
  },
  buttonTextSmall: {
    fontSize: 14,
  },
  buttonTextMedium: {
    fontSize: 16,
  },
  buttonTextLarge: {
    fontSize: 18,
  },

  // Card styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    ...shadows.small,
  },

  // Badge styles
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.small,
    fontWeight: '600',
  },

  // Avatar styles
  avatar: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Divider styles
  divider: {
    backgroundColor: theme.colors.surfaceVariant,
    width: '100%',
  },

  // Empty State styles
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: theme.colors.onSurface,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyStateDescription: {
    ...typography.body,
    color: theme.colors.outline,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: spacing.xl,
  },

  // Loading styles
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: theme.colors.outline,
    marginTop: spacing.md,
  },

  // Chip styles
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  chipText: {
    ...typography.caption,
    color: theme.colors.onSurface,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  chipDelete: {
    marginLeft: spacing.xs,
  },

  // Status Indicator styles
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {},
  statusLabel: {
    ...typography.caption,
    color: theme.colors.onSurface,
    marginLeft: spacing.sm,
  },
});
