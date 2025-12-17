import React from 'react';
import { View, Text, Image, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const avatarVariants = cva(
  'items-center justify-center overflow-hidden rounded-full bg-dark-elevated',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
        '2xl': 'h-24 w-24',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const avatarTextVariants = cva('font-semibold text-white uppercase', {
  variants: {
    size: {
      xs: 'text-[10px]',
      sm: 'text-xs',
      default: 'text-sm',
      lg: 'text-base',
      xl: 'text-xl',
      '2xl': 'text-3xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface AvatarProps extends ViewProps, VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  online?: boolean;
}

export const Avatar = React.forwardRef<View, AvatarProps>(
  ({ className, size, src, alt, fallback, online, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const getInitials = (name?: string): string => {
      if (!name) return '?';
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`;
      }
      return name.slice(0, 2);
    };

    const showFallback = !src || imageError;

    return (
      <View className="relative">
        <View
          ref={ref}
          className={cn(avatarVariants({ size }), className)}
          {...props}
        >
          {showFallback ? (
            <Text className={avatarTextVariants({ size })}>
              {getInitials(fallback || alt)}
            </Text>
          ) : (
            <Image
              source={{ uri: src }}
              alt={alt}
              className="h-full w-full"
              onError={() => setImageError(true)}
            />
          )}
        </View>
        {online !== undefined && (
          <View
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-2 border-dark-bg',
              size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3',
              online ? 'bg-green-500' : 'bg-dark-muted',
            )}
          />
        )}
      </View>
    );
  },
);

Avatar.displayName = 'Avatar';

// Avatar Group
export interface AvatarGroupProps {
  avatars: Array<{ src?: string; alt?: string; fallback?: string }>;
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 'default',
  className,
}) => {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <View className={cn('flex-row', className)}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={index}
          className={cn('border-2 border-dark-bg rounded-full', index > 0 && '-ml-2')}
          style={{ zIndex: visibleAvatars.length - index }}
        >
          <Avatar {...avatar} size={size} />
        </View>
      ))}
      {remainingCount > 0 && (
        <View
          className={cn(
            avatarVariants({ size }),
            'bg-dark-elevated border-2 border-dark-bg -ml-2',
          )}
          style={{ zIndex: 0 }}
        >
          <Text className={avatarTextVariants({ size })}>+{remainingCount}</Text>
        </View>
      )}
    </View>
  );
};
