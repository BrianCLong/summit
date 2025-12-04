import React from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const progressVariants = cva('h-full rounded-full', {
  variants: {
    variant: {
      default: 'bg-intel-500',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      destructive: 'bg-red-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface ProgressBarProps extends VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
  height?: 'sm' | 'default' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant,
  showLabel = false,
  label,
  className,
  height = 'default',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heightClasses = {
    sm: 'h-1',
    default: 'h-2',
    lg: 'h-3',
  };

  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(`${percentage}%`, {
      damping: 15,
      stiffness: 100,
    }),
  }));

  return (
    <View className={cn('w-full', className)}>
      {(showLabel || label) && (
        <View className="flex-row justify-between mb-1">
          {label && <Text className="text-sm text-dark-muted">{label}</Text>}
          {showLabel && (
            <Text className="text-sm text-dark-muted">{Math.round(percentage)}%</Text>
          )}
        </View>
      )}
      <View
        className={cn(
          'w-full rounded-full bg-dark-elevated overflow-hidden',
          heightClasses[height],
        )}
      >
        <Animated.View
          style={animatedStyle}
          className={progressVariants({ variant })}
        />
      </View>
    </View>
  );
};

// Circular Progress
export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showLabel?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 60,
  strokeWidth = 6,
  color = '#0ea5e9',
  showLabel = true,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View className={cn('items-center justify-center', className)} style={{ width: size, height: size }}>
      <View
        className="absolute"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#27272a',
        }}
      />
      <View
        className="absolute"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          borderRightColor: percentage > 25 ? color : 'transparent',
          borderBottomColor: percentage > 50 ? color : 'transparent',
          borderLeftColor: percentage > 75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {showLabel && (
        <Text className="text-sm font-semibold text-white">{Math.round(percentage)}%</Text>
      )}
    </View>
  );
};
