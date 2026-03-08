"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChipGroup = exports.Chip = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const lucide_react_native_1 = require("lucide-react-native");
const chipVariants = (0, class_variance_authority_1.cva)('flex-row items-center rounded-full px-3 py-1.5', {
    variants: {
        variant: {
            default: 'bg-dark-elevated',
            primary: 'bg-intel-600/20 border border-intel-600/50',
            secondary: 'bg-dark-muted/20 border border-dark-muted',
            success: 'bg-green-600/20 border border-green-600/50',
            warning: 'bg-amber-600/20 border border-amber-600/50',
            destructive: 'bg-red-600/20 border border-red-600/50',
        },
        selected: {
            true: '',
            false: '',
        },
    },
    compoundVariants: [
        {
            variant: 'default',
            selected: true,
            className: 'bg-intel-600',
        },
    ],
    defaultVariants: {
        variant: 'default',
        selected: false,
    },
});
const chipTextVariants = (0, class_variance_authority_1.cva)('text-sm font-medium', {
    variants: {
        variant: {
            default: 'text-white',
            primary: 'text-intel-400',
            secondary: 'text-dark-muted',
            success: 'text-green-400',
            warning: 'text-amber-400',
            destructive: 'text-red-400',
        },
        selected: {
            true: 'text-white',
            false: '',
        },
    },
    defaultVariants: {
        variant: 'default',
        selected: false,
    },
});
const Chip = ({ children, variant, selected, onPress, onRemove, leftIcon, className, disabled, }) => {
    const content = (<react_native_1.View className={(0, cn_1.cn)(chipVariants({ variant, selected }), disabled && 'opacity-50', className)}>
      {leftIcon && <react_native_1.View className="mr-1.5">{leftIcon}</react_native_1.View>}
      <react_native_1.Text className={chipTextVariants({ variant, selected })}>{children}</react_native_1.Text>
      {onRemove && (<react_native_1.TouchableOpacity onPress={onRemove} className="ml-1.5" disabled={disabled}>
          <lucide_react_native_1.X size={14} color={selected ? '#fff' : '#71717a'}/>
        </react_native_1.TouchableOpacity>)}
    </react_native_1.View>);
    if (onPress) {
        return (<react_native_1.TouchableOpacity onPress={onPress} disabled={disabled}>
        {content}
      </react_native_1.TouchableOpacity>);
    }
    return content;
};
exports.Chip = Chip;
const ChipGroup = ({ options, selected, onSelectionChange, variant, className, }) => {
    const toggleSelection = (option) => {
        if (selected.includes(option)) {
            onSelectionChange(selected.filter((s) => s !== option));
        }
        else {
            onSelectionChange([...selected, option]);
        }
    };
    return (<react_native_1.View className={(0, cn_1.cn)('flex-row flex-wrap gap-2', className)}>
      {options.map((option) => (<exports.Chip key={option} variant={variant} selected={selected.includes(option)} onPress={() => toggleSelection(option)}>
          {option}
        </exports.Chip>))}
    </react_native_1.View>);
};
exports.ChipGroup = ChipGroup;
