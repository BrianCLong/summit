import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const textVariants = cva('text-white', {
  variants: {
    variant: {
      default: '',
      muted: 'text-dark-muted',
      primary: 'text-intel-400',
      destructive: 'text-red-500',
      success: 'text-green-500',
      warning: 'text-amber-500',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    weight: 'normal',
  },
});

export interface TextProps extends RNTextProps, VariantProps<typeof textVariants> {
  className?: string;
}

export const Text = React.forwardRef<RNText, TextProps>(
  ({ className, variant, size, weight, children, ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(textVariants({ variant, size, weight }), className)}
        {...props}
      >
        {children}
      </RNText>
    );
  },
);

Text.displayName = 'Text';

// Heading component
export const Heading: React.FC<TextProps & { level?: 1 | 2 | 3 | 4 }> = ({
  level = 1,
  className,
  ...props
}) => {
  const sizes = {
    1: '3xl' as const,
    2: '2xl' as const,
    3: 'xl' as const,
    4: 'lg' as const,
  };

  return <Text size={sizes[level]} weight="bold" className={className} {...props} />;
};

// Label component
export const Label: React.FC<TextProps> = ({ className, ...props }) => (
  <Text size="sm" weight="medium" className={cn('mb-1.5', className)} {...props} />
);

// Caption component
export const Caption: React.FC<TextProps> = ({ className, ...props }) => (
  <Text size="xs" variant="muted" className={className} {...props} />
);
