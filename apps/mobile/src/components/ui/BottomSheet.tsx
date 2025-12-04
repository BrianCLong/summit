import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { cn } from '@/utils/cn';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.9],
  className,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const context = useSharedValue({ y: 0 });

  const maxTranslateY = useMemo(
    () => -SCREEN_HEIGHT * Math.max(...snapPoints),
    [snapPoints],
  );

  const scrollTo = useCallback(
    (destination: number) => {
      'worklet';
      translateY.value = withSpring(destination, {
        damping: 50,
        stiffness: 500,
      });
    },
    [translateY],
  );

  React.useEffect(() => {
    if (open) {
      scrollTo(-SCREEN_HEIGHT * snapPoints[0]);
    } else {
      scrollTo(SCREEN_HEIGHT);
    }
  }, [open, scrollTo, snapPoints]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(
        context.value.y + event.translationY,
        maxTranslateY,
      );
    })
    .onEnd((event) => {
      if (event.velocityY > 500) {
        runOnJS(onClose)();
      } else if (translateY.value > -SCREEN_HEIGHT * 0.3) {
        runOnJS(onClose)();
      } else {
        // Find nearest snap point
        const nearestSnap = snapPoints.reduce((prev, curr) => {
          const prevDist = Math.abs(-SCREEN_HEIGHT * prev - translateY.value);
          const currDist = Math.abs(-SCREEN_HEIGHT * curr - translateY.value);
          return currDist < prevDist ? curr : prev;
        });
        scrollTo(-SCREEN_HEIGHT * nearestSnap);
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const rBackdropStyle = useAnimatedStyle(() => ({
    opacity: withSpring(open ? 0.5 : 0),
    pointerEvents: open ? 'auto' : 'none',
  }));

  return (
    <>
      <Animated.View
        style={rBackdropStyle}
        className="absolute inset-0 bg-black"
        onTouchEnd={onClose}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[{ height: SCREEN_HEIGHT }, rBottomSheetStyle]}
          className={cn(
            'absolute w-full bg-dark-surface rounded-t-3xl',
            className,
          )}
        >
          <View className="w-12 h-1 bg-dark-muted rounded-full self-center my-3" />
          {title && (
            <View className="px-4 pb-4 border-b border-dark-border">
              <Text className="text-lg font-semibold text-white text-center">
                {title}
              </Text>
            </View>
          )}
          <View className="flex-1 px-4">{children}</View>
        </Animated.View>
      </GestureDetector>
    </>
  );
};
