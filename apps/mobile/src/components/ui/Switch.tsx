import React from 'react';
import { Switch as RNSwitch, View, Text, type SwitchProps as RNSwitchProps } from 'react-native';
import { cn } from '@/utils/cn';

export interface SwitchProps extends Omit<RNSwitchProps, 'value' | 'onValueChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onCheckedChange,
  label,
  description,
  className,
  disabled,
  ...props
}) => {
  return (
    <View className={cn('flex-row items-center justify-between', className)}>
      {(label || description) && (
        <View className="flex-1 mr-4">
          {label && (
            <Text className={cn('text-base text-white', disabled && 'opacity-50')}>
              {label}
            </Text>
          )}
          {description && (
            <Text className={cn('text-sm text-dark-muted mt-0.5', disabled && 'opacity-50')}>
              {description}
            </Text>
          )}
        </View>
      )}
      <RNSwitch
        value={checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        trackColor={{ false: '#27272a', true: '#0284c7' }}
        thumbColor={checked ? '#fff' : '#71717a'}
        ios_backgroundColor="#27272a"
        {...props}
      />
    </View>
  );
};
