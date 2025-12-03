import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { cn } from '@/utils/cn';
import { ChevronDown, Check, X } from 'lucide-react-native';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onValueChange?.(option.value);
    setIsOpen(false);
  };

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-white">{label}</Text>
      )}

      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        className={cn(
          'flex-row items-center justify-between h-12 px-4 rounded-lg border',
          error ? 'border-red-500' : 'border-dark-border',
          'bg-dark-elevated',
          disabled && 'opacity-50',
        )}
        disabled={disabled}
      >
        <Text className={cn('text-base', selectedOption ? 'text-white' : 'text-dark-muted')}>
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDown size={20} color="#71717a" />
      </TouchableOpacity>

      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50">
          <View className="flex-1 justify-end">
            <View className="bg-dark-surface rounded-t-3xl max-h-[70%]">
              <View className="flex-row items-center justify-between p-4 border-b border-dark-border">
                <Text className="text-lg font-semibold text-white">
                  {label || 'Select Option'}
                </Text>
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    className={cn(
                      'flex-row items-center justify-between px-4 py-4 border-b border-dark-border',
                      item.disabled && 'opacity-50',
                    )}
                    disabled={item.disabled}
                  >
                    <Text
                      className={cn(
                        'text-base',
                        item.value === value ? 'text-intel-400' : 'text-white',
                      )}
                    >
                      {item.label}
                    </Text>
                    {item.value === value && <Check size={20} color="#0ea5e9" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};
