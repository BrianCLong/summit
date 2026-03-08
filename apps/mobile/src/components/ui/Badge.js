"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityTypeBadge = exports.ClassificationBadge = exports.PriorityBadge = exports.Badge = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const badgeVariants = (0, class_variance_authority_1.cva)('flex-row items-center justify-center rounded-full px-2.5 py-0.5', {
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
});
const badgeTextVariants = (0, class_variance_authority_1.cva)('font-medium', {
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
exports.Badge = react_1.default.forwardRef(({ className, textClassName, variant, size, children, leftIcon, ...props }, ref) => {
    return (<react_native_1.View ref={ref} className={(0, cn_1.cn)(badgeVariants({ variant, size }), className)} {...props}>
        {leftIcon && <react_native_1.View className="mr-1">{leftIcon}</react_native_1.View>}
        {typeof children === 'string' ? (<react_native_1.Text className={(0, cn_1.cn)(badgeTextVariants({ variant, size }), textClassName)}>
            {children}
          </react_native_1.Text>) : (children)}
      </react_native_1.View>);
});
exports.Badge.displayName = 'Badge';
// Priority Badge
const priorityVariants = {
    CRITICAL: 'destructive',
    HIGH: 'warning',
    MEDIUM: 'default',
    LOW: 'success',
    INFO: 'primary',
};
const PriorityBadge = ({ priority, className, }) => (<exports.Badge variant={priorityVariants[priority]} className={className}>
    {priority}
  </exports.Badge>);
exports.PriorityBadge = PriorityBadge;
// Classification Badge
const classificationColors = {
    UNCLASSIFIED: 'bg-classification-unclassified',
    CONFIDENTIAL: 'bg-classification-confidential',
    SECRET: 'bg-classification-secret',
    TOP_SECRET: 'bg-classification-topsecret',
};
const ClassificationBadge = ({ classification, className }) => (<react_native_1.View className={(0, cn_1.cn)('px-2 py-0.5 rounded', classificationColors[classification], className)}>
    <react_native_1.Text className={(0, cn_1.cn)('text-xs font-bold', classification === 'SECRET' ? 'text-black' : 'text-white')}>
      {classification.replace('_', ' ')}
    </react_native_1.Text>
  </react_native_1.View>);
exports.ClassificationBadge = ClassificationBadge;
// Entity Type Badge
const entityColors = {
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
const EntityTypeBadge = ({ type, className, }) => (<react_native_1.View className={(0, cn_1.cn)('px-2 py-0.5 rounded', entityColors[type], className)}>
    <react_native_1.Text className="text-xs font-medium text-white">{type}</react_native_1.Text>
  </react_native_1.View>);
exports.EntityTypeBadge = EntityTypeBadge;
