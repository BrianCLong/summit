import React from 'react';
import { View, Text as RNText, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import type { Priority, ClassificationLevel, EntityType } from '@/types';

const badgeVariants = cva(
  'flex-row items-center justify-center rounded-full px-2.5 py-0.5',
  {
    variants: {
      variant: {
        default: 'bg-dark-elevated',
        primary: 'bg-intel-600',
        secondary: 'bg-dark-muted',
        success: 'bg-green-600',
        warning: 'bg-amber-600',
        destructive: 'bg-red-600',
        outline: 'border border-dark-border bg-transparent',
      },
      size: {
        default: 'h-6',
        sm: 'h-5',
        lg: 'h-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const badgeTextVariants = cva('font-medium', {
  variants: {
    variant: {
      default: 'text-white',
      primary: 'text-white',
      secondary: 'text-white',
      success: 'text-white',
      warning: 'text-black',
      destructive: 'text-white',
      outline: 'text-dark-muted',
    },
    size: {
      default: 'text-xs',
      sm: 'text-[10px]',
      lg: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  leftIcon?: React.ReactNode;
}

export const Badge = React.forwardRef<View, BadgeProps>(
  ({ className, textClassName, variant, size, children, leftIcon, ...props }, ref) => {
    return (
      <View ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props}>
        {leftIcon && <View className="mr-1">{leftIcon}</View>}
        {typeof children === 'string' ? (
          <RNText className={cn(badgeTextVariants({ variant, size }), textClassName)}>
            {children}
          </RNText>
        ) : (
          children
        )}
      </View>
    );
  },
);
Badge.displayName = 'Badge';

// Priority Badge
const priorityVariants: Record<Priority, 'destructive' | 'warning' | 'default' | 'success' | 'primary'> = {
  CRITICAL: 'destructive',
  HIGH: 'warning',
  MEDIUM: 'default',
  LOW: 'success',
  INFO: 'primary',
};

export const PriorityBadge: React.FC<{ priority: Priority; className?: string }> = ({
  priority,
  className,
}) => (
  <Badge variant={priorityVariants[priority]} className={className}>
    {priority}
  </Badge>
);

// Classification Badge
const classificationColors: Record<ClassificationLevel, string> = {
  UNCLASSIFIED: 'bg-classification-unclassified',
  CONFIDENTIAL: 'bg-classification-confidential',
  SECRET: 'bg-classification-secret',
  TOP_SECRET: 'bg-classification-topsecret',
};

export const ClassificationBadge: React.FC<{
  classification: ClassificationLevel;
  className?: string;
}> = ({ classification, className }) => (
  <View className={cn('px-2 py-0.5 rounded', classificationColors[classification], className)}>
    <RNText className={cn('text-xs font-bold', classification === 'SECRET' ? 'text-black' : 'text-white')}>
      {classification.replace('_', ' ')}
    </RNText>
  </View>
);

// Entity Type Badge
const entityColors: Record<EntityType, string> = {
  PERSON: 'bg-entity-person',
  ORGANIZATION: 'bg-entity-organization',
  LOCATION: 'bg-entity-location',
  EVENT: 'bg-entity-event',
  DOCUMENT: 'bg-entity-document',
  THREAT: 'bg-entity-threat',
  VEHICLE: 'bg-slate-600',
  DEVICE: 'bg-cyan-600',
  FINANCIAL: 'bg-emerald-600',
  COMMUNICATION: 'bg-indigo-600',
};

export const EntityTypeBadge: React.FC<{ type: EntityType; className?: string }> = ({
  type,
  className,
}) => (
  <View className={cn('px-2 py-0.5 rounded', entityColors[type], className)}>
    <RNText className="text-xs font-medium text-white">{type}</RNText>
  </View>
);
