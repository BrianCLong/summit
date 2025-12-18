import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const cardVariants = cva('rounded-xl', {
  variants: {
    variant: {
      default: 'bg-dark-surface border border-dark-border',
      elevated: 'bg-dark-elevated shadow-lg',
      ghost: 'bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {
  className?: string;
}

export const Card = React.forwardRef<View, CardProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <View ref={ref} className={cn(cardVariants({ variant }), className)} {...props}>
        {children}
      </View>
    );
  },
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<View, ViewProps & { className?: string }>(
  ({ className, children, ...props }, ref) => {
    return (
      <View ref={ref} className={cn('p-4 pb-2', className)} {...props}>
        {children}
      </View>
    );
  },
);
CardHeader.displayName = 'CardHeader';

export const CardContent = React.forwardRef<View, ViewProps & { className?: string }>(
  ({ className, children, ...props }, ref) => {
    return (
      <View ref={ref} className={cn('p-4 pt-0', className)} {...props}>
        {children}
      </View>
    );
  },
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<View, ViewProps & { className?: string }>(
  ({ className, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('flex-row items-center p-4 pt-0', className)}
        {...props}
      >
        {children}
      </View>
    );
  },
);
CardFooter.displayName = 'CardFooter';
