"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvatarGroup = exports.Avatar = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const avatarVariants = (0, class_variance_authority_1.cva)('items-center justify-center overflow-hidden rounded-full bg-dark-elevated', {
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
});
const avatarTextVariants = (0, class_variance_authority_1.cva)('font-semibold text-white uppercase', {
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
exports.Avatar = react_1.default.forwardRef(({ className, size, src, alt, fallback, online, ...props }, ref) => {
    const [imageError, setImageError] = react_1.default.useState(false);
    const getInitials = (name) => {
        if (!name)
            return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`;
        }
        return name.slice(0, 2);
    };
    const showFallback = !src || imageError;
    return (<react_native_1.View className="relative">
        <react_native_1.View ref={ref} className={(0, cn_1.cn)(avatarVariants({ size }), className)} {...props}>
          {showFallback ? (<react_native_1.Text className={avatarTextVariants({ size })}>
              {getInitials(fallback || alt)}
            </react_native_1.Text>) : (<react_native_1.Image source={{ uri: src }} alt={alt} className="h-full w-full" onError={() => setImageError(true)}/>)}
        </react_native_1.View>
        {online !== undefined && (<react_native_1.View className={(0, cn_1.cn)('absolute bottom-0 right-0 rounded-full border-2 border-dark-bg', size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3', online ? 'bg-green-500' : 'bg-dark-muted')}/>)}
      </react_native_1.View>);
});
exports.Avatar.displayName = 'Avatar';
const AvatarGroup = ({ avatars, max = 4, size = 'default', className, }) => {
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;
    return (<react_native_1.View className={(0, cn_1.cn)('flex-row', className)}>
      {visibleAvatars.map((avatar, index) => (<react_native_1.View key={index} className={(0, cn_1.cn)('border-2 border-dark-bg rounded-full', index > 0 && '-ml-2')} style={{ zIndex: visibleAvatars.length - index }}>
          <exports.Avatar {...avatar} size={size}/>
        </react_native_1.View>))}
      {remainingCount > 0 && (<react_native_1.View className={(0, cn_1.cn)(avatarVariants({ size }), 'bg-dark-elevated border-2 border-dark-bg -ml-2')} style={{ zIndex: 0 }}>
          <react_native_1.Text className={avatarTextVariants({ size })}>+{remainingCount}</react_native_1.Text>
        </react_native_1.View>)}
    </react_native_1.View>);
};
exports.AvatarGroup = AvatarGroup;
