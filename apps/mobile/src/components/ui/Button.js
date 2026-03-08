"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const buttonVariants = (0, class_variance_authority_1.cva)('flex-row items-center justify-center rounded-lg active:opacity-80', {
    variants: {
        variant: {
            default: 'bg-intel-600',
            destructive: 'bg-red-600',
            outline: 'border border-dark-border bg-transparent',
            secondary: 'bg-dark-elevated',
            ghost: 'bg-transparent',
            link: 'bg-transparent',
        },
        size: {
            default: 'h-12 px-6',
            sm: 'h-9 px-4',
            lg: 'h-14 px-8',
            icon: 'h-12 w-12',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});
const buttonTextVariants = (0, class_variance_authority_1.cva)('font-semibold text-center', {
    variants: {
        variant: {
            default: 'text-white',
            destructive: 'text-white',
            outline: 'text-white',
            secondary: 'text-white',
            ghost: 'text-white',
            link: 'text-intel-400 underline',
        },
        size: {
            default: 'text-base',
            sm: 'text-sm',
            lg: 'text-lg',
            icon: 'text-base',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});
exports.Button = react_1.default.forwardRef(({ className, textClassName, variant, size, children, loading, leftIcon, rightIcon, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (<react_native_1.TouchableOpacity ref={ref} className={(0, cn_1.cn)(buttonVariants({ variant, size }), isDisabled && 'opacity-50', className)} disabled={isDisabled} {...props}>
        {loading ? (<react_native_1.ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? '#fff' : '#fff'}/>) : (<>
            {leftIcon && <react_native_1.View className="mr-2">{leftIcon}</react_native_1.View>}
            {typeof children === 'string' ? (<react_native_1.Text className={(0, cn_1.cn)(buttonTextVariants({ variant, size }), textClassName)}>
                {children}
              </react_native_1.Text>) : (children)}
            {rightIcon && <react_native_1.View className="ml-2">{rightIcon}</react_native_1.View>}
          </>)}
      </react_native_1.TouchableOpacity>);
});
exports.Button.displayName = 'Button';
