"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardFooter = exports.CardContent = exports.CardHeader = exports.Card = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const cardVariants = (0, class_variance_authority_1.cva)('rounded-xl', {
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
exports.Card = react_1.default.forwardRef(({ className, variant, children, ...props }, ref) => {
    return (<react_native_1.View ref={ref} className={(0, cn_1.cn)(cardVariants({ variant }), className)} {...props}>
        {children}
      </react_native_1.View>);
});
exports.Card.displayName = 'Card';
exports.CardHeader = react_1.default.forwardRef(({ className, children, ...props }, ref) => {
    return (<react_native_1.View ref={ref} className={(0, cn_1.cn)('p-4 pb-2', className)} {...props}>
        {children}
      </react_native_1.View>);
});
exports.CardHeader.displayName = 'CardHeader';
exports.CardContent = react_1.default.forwardRef(({ className, children, ...props }, ref) => {
    return (<react_native_1.View ref={ref} className={(0, cn_1.cn)('p-4 pt-0', className)} {...props}>
        {children}
      </react_native_1.View>);
});
exports.CardContent.displayName = 'CardContent';
exports.CardFooter = react_1.default.forwardRef(({ className, children, ...props }, ref) => {
    return (<react_native_1.View ref={ref} className={(0, cn_1.cn)('flex-row items-center p-4 pt-0', className)} {...props}>
        {children}
      </react_native_1.View>);
});
exports.CardFooter.displayName = 'CardFooter';
