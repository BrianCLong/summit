import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { Eye, EyeOff } from 'lucide-react-native';

const inputVariants = cva(
  'w-full rounded-lg border px-4 text-white font-normal',
  {
    variants: {
      variant: {
        default: 'border-dark-border bg-dark-elevated focus:border-intel-500',
        error: 'border-red-500 bg-dark-elevated',
        success: 'border-green-500 bg-dark-elevated',
      },
      size: {
        default: 'h-12 text-base',
        sm: 'h-10 text-sm',
        lg: 'h-14 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface InputProps
  extends Omit<TextInputProps, 'style'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      className,
      containerClassName,
      variant,
      size,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      secureTextEntry,
      ...props
    },
    ref,
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const actualVariant = error ? 'error' : variant;
    const showPasswordToggle = secureTextEntry !== undefined;

    return (
      <View className={cn('w-full', containerClassName)}>
        {label && (
          <Text className="mb-1.5 text-sm font-medium text-white">{label}</Text>
        )}
        <View className="relative">
          {leftIcon && (
            <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            className={cn(
              inputVariants({ variant: actualVariant, size }),
              leftIcon && 'pl-12',
              (rightIcon || showPasswordToggle) && 'pr-12',
              isFocused && 'border-intel-500',
              className,
            )}
            placeholderTextColor="#71717a"
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {showPasswordToggle && (
            <TouchableOpacity
              className="absolute right-4 top-0 bottom-0 justify-center"
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              {isPasswordVisible ? (
                <EyeOff size={20} color="#71717a" />
              ) : (
                <Eye size={20} color="#71717a" />
              )}
            </TouchableOpacity>
          )}
          {rightIcon && !showPasswordToggle && (
            <View className="absolute right-4 top-0 bottom-0 justify-center">
              {rightIcon}
            </View>
          )}
        </View>
        {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
        {hint && !error && (
          <Text className="mt-1 text-sm text-dark-muted">{hint}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';

// Search Input variant
export const SearchInput = React.forwardRef<TextInput, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn('rounded-full', className)}
        placeholder="Search..."
        returnKeyType="search"
        {...props}
      />
    );
  },
);

SearchInput.displayName = 'SearchInput';
