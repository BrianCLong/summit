import React, { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { cn } from '@/utils/cn';

export interface SkeletonProps extends ViewProps {
  className?: string;
  variant?: 'default' | 'circular' | 'text';
  width?: number | string;
  height?: number | string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'default',
  width,
  height,
  style,
  ...props
}) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  const variantClasses = {
    default: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <Animated.View
      className={cn('bg-dark-elevated', variantClasses[variant], className)}
      style={[{ width, height }, animatedStyle, style]}
      {...props}
    />
  );
};

// Skeleton Card
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <View className={cn('p-4 rounded-xl bg-dark-surface border border-dark-border', className)}>
    <View className="flex-row items-center mb-4">
      <Skeleton variant="circular" width={40} height={40} />
      <View className="ml-3 flex-1">
        <Skeleton variant="text" className="w-3/4 mb-2" />
        <Skeleton variant="text" className="w-1/2" />
      </View>
    </View>
    <Skeleton variant="text" className="w-full mb-2" />
    <Skeleton variant="text" className="w-4/5 mb-2" />
    <Skeleton variant="text" className="w-2/3" />
  </View>
);

// Skeleton List Item
export const SkeletonListItem: React.FC<{ className?: string }> = ({ className }) => (
  <View className={cn('flex-row items-center p-4', className)}>
    <Skeleton variant="circular" width={48} height={48} />
    <View className="ml-3 flex-1">
      <Skeleton variant="text" className="w-3/4 mb-2" />
      <Skeleton variant="text" className="w-1/2" />
    </View>
  </View>
);

// Skeleton Entity Card
export const SkeletonEntityCard: React.FC<{ className?: string }> = ({ className }) => (
  <View className={cn('p-4 rounded-xl bg-dark-surface border border-dark-border', className)}>
    <View className="flex-row items-center justify-between mb-3">
      <Skeleton variant="default" width={80} height={24} className="rounded-full" />
      <Skeleton variant="default" width={60} height={20} className="rounded" />
    </View>
    <Skeleton variant="text" className="w-4/5 mb-2 h-6" />
    <Skeleton variant="text" className="w-full mb-2" />
    <Skeleton variant="text" className="w-2/3" />
    <View className="flex-row mt-4 gap-2">
      <Skeleton variant="default" width={60} height={24} className="rounded-full" />
      <Skeleton variant="default" width={60} height={24} className="rounded-full" />
    </View>
  </View>
);
