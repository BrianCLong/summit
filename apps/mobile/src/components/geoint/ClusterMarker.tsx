import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { cn } from '@/utils/cn';

interface ClusterMarkerProps {
  count: number;
  onPress?: () => void;
  priorityBreakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const getClusterSize = (count: number): number => {
  if (count < 10) return 40;
  if (count < 50) return 50;
  if (count < 100) return 60;
  return 70;
};

const getClusterColor = (
  count: number,
  priorityBreakdown?: ClusterMarkerProps['priorityBreakdown'],
): string => {
  // If there are critical items, show red
  if (priorityBreakdown && priorityBreakdown.critical > 0) {
    return '#ef4444';
  }
  // If there are high priority items, show orange
  if (priorityBreakdown && priorityBreakdown.high > 0) {
    return '#f59e0b';
  }
  // Color based on count
  if (count < 10) return '#0ea5e9';
  if (count < 50) return '#8b5cf6';
  return '#6366f1';
};

const formatCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}K`;
  return `${Math.floor(count / 1000)}K`;
};

export const ClusterMarker: React.FC<ClusterMarkerProps> = ({
  count,
  onPress,
  priorityBreakdown,
}) => {
  const scale = useSharedValue(1);
  const size = getClusterSize(count);
  const color = getClusterColor(count, priorityBreakdown);

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
        className="items-center justify-center border-2 border-white shadow-lg"
      >
        <Text
          className="text-white font-bold"
          style={{ fontSize: size < 50 ? 12 : 14 }}
        >
          {formatCount(count)}
        </Text>
      </Animated.View>

      {/* Priority ring indicator */}
      {priorityBreakdown && priorityBreakdown.critical > 0 && (
        <View
          style={{
            position: 'absolute',
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderWidth: 2,
            borderColor: '#ef4444',
            top: -4,
            left: -4,
          }}
        />
      )}
    </TouchableOpacity>
  );
};

// Donut cluster showing composition
export const DonutClusterMarker: React.FC<{
  count: number;
  composition: { type: string; count: number; color: string }[];
  onPress?: () => void;
}> = ({ count, composition, onPress }) => {
  const size = getClusterSize(count);
  const total = composition.reduce((sum, c) => sum + c.count, 0);

  // Calculate arc angles
  let currentAngle = 0;
  const arcs = composition.map((c) => {
    const angle = (c.count / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...c, startAngle, endAngle: currentAngle };
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#1e1e20',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#27272a',
      }}
    >
      {/* Outer ring with composition - simplified representation */}
      <View
        style={{
          position: 'absolute',
          width: size - 4,
          height: size - 4,
          borderRadius: (size - 4) / 2,
          borderWidth: 4,
          borderColor: composition[0]?.color || '#6366f1',
        }}
      />

      {/* Inner count */}
      <View
        style={{
          width: size - 16,
          height: size - 16,
          borderRadius: (size - 16) / 2,
          backgroundColor: '#141415',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text className="text-white font-bold text-sm">{formatCount(count)}</Text>
      </View>
    </TouchableOpacity>
  );
};
