import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react-native';

export interface AccordionItemData {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItemData[];
  type?: 'single' | 'multiple';
  defaultOpenIds?: string[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  type = 'single',
  defaultOpenIds = [],
  className,
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggleItem = (id: string) => {
    if (type === 'single') {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    } else {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      );
    }
  };

  return (
    <View className={cn('rounded-xl border border-dark-border overflow-hidden', className)}>
      {items.map((item, index) => (
        <AccordionItem
          key={item.id}
          item={item}
          isOpen={openIds.includes(item.id)}
          onToggle={() => toggleItem(item.id)}
          isLast={index === items.length - 1}
        />
      ))}
    </View>
  );
};

interface AccordionItemProps {
  item: AccordionItemData;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  item,
  isOpen,
  onToggle,
  isLast,
}) => {
  const rotation = useSharedValue(isOpen ? 180 : 0);
  const height = useSharedValue(isOpen ? 1 : 0);

  React.useEffect(() => {
    rotation.value = withTiming(isOpen ? 180 : 0, { duration: 200 });
    height.value = withTiming(isOpen ? 1 : 0, { duration: 200 });
  }, [isOpen, rotation, height]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: height.value * 500,
  }));

  return (
    <View
      className={cn(
        'bg-dark-surface',
        !isLast && 'border-b border-dark-border',
      )}
    >
      <TouchableOpacity
        onPress={onToggle}
        disabled={item.disabled}
        className={cn(
          'flex-row items-center justify-between p-4',
          item.disabled && 'opacity-50',
        )}
      >
        <Text className="flex-1 text-base font-medium text-white">{item.title}</Text>
        <Animated.View style={iconStyle}>
          <ChevronDown size={20} color="#71717a" />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={contentStyle} className="overflow-hidden">
        <View className="px-4 pb-4">
          {typeof item.content === 'string' ? (
            <Text className="text-dark-muted">{item.content}</Text>
          ) : (
            item.content
          )}
        </View>
      </Animated.View>
    </View>
  );
};
