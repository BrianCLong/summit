import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react-native';

const chipVariants = cva(
  'flex-row items-center rounded-full px-3 py-1.5',
  {
    variants: {
      variant: {
        default: 'bg-dark-elevated',
        primary: 'bg-intel-600/20 border border-intel-600/50',
        secondary: 'bg-dark-muted/20 border border-dark-muted',
        success: 'bg-green-600/20 border border-green-600/50',
        warning: 'bg-amber-600/20 border border-amber-600/50',
        destructive: 'bg-red-600/20 border border-red-600/50',
      },
      selected: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        selected: true,
        className: 'bg-intel-600',
      },
    ],
    defaultVariants: {
      variant: 'default',
      selected: false,
    },
  },
);

const chipTextVariants = cva('text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-white',
      primary: 'text-intel-400',
      secondary: 'text-dark-muted',
      success: 'text-green-400',
      warning: 'text-amber-400',
      destructive: 'text-red-400',
    },
    selected: {
      true: 'text-white',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    selected: false,
  },
});

export interface ChipProps extends VariantProps<typeof chipVariants> {
  children: string;
  onPress?: () => void;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant,
  selected,
  onPress,
  onRemove,
  leftIcon,
  className,
  disabled,
}) => {
  const content = (
    <View className={cn(chipVariants({ variant, selected }), disabled && 'opacity-50', className)}>
      {leftIcon && <View className="mr-1.5">{leftIcon}</View>}
      <Text className={chipTextVariants({ variant, selected })}>{children}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} className="ml-1.5" disabled={disabled}>
          <X size={14} color={selected ? '#fff' : '#71717a'} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Chip Group for multi-select
export interface ChipGroupProps {
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  variant?: VariantProps<typeof chipVariants>['variant'];
  className?: string;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  options,
  selected,
  onSelectionChange,
  variant,
  className,
}) => {
  const toggleSelection = (option: string) => {
    if (selected.includes(option)) {
      onSelectionChange(selected.filter((s) => s !== option));
    } else {
      onSelectionChange([...selected, option]);
    }
  };

  return (
    <View className={cn('flex-row flex-wrap gap-2', className)}>
      {options.map((option) => (
        <Chip
          key={option}
          variant={variant}
          selected={selected.includes(option)}
          onPress={() => toggleSelection(option)}
        >
          {option}
        </Chip>
      ))}
    </View>
  );
};
