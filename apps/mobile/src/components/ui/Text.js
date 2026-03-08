"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Caption = exports.Label = exports.Heading = exports.Text = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const textVariants = (0, class_variance_authority_1.cva)('text-white', {
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
exports.Text = react_1.default.forwardRef(({ className, variant, size, weight, children, ...props }, ref) => {
    return (<react_native_1.Text ref={ref} className={(0, cn_1.cn)(textVariants({ variant, size, weight }), className)} {...props}>
        {children}
      </react_native_1.Text>);
});
exports.Text.displayName = 'Text';
// Heading component
const Heading = ({ level = 1, className, ...props }) => {
    const sizes = {
        1: '3xl',
        2: '2xl',
        3: 'xl',
        4: 'lg',
    };
    return <exports.Text size={sizes[level]} weight="bold" className={className} {...props}/>;
};
exports.Heading = Heading;
// Label component
const Label = ({ className, ...props }) => (<exports.Text size="sm" weight="medium" className={(0, cn_1.cn)('mb-1.5', className)} {...props}/>);
exports.Label = Label;
// Caption component
const Caption = ({ className, ...props }) => (<exports.Text size="xs" variant="muted" className={className} {...props}/>);
exports.Caption = Caption;
