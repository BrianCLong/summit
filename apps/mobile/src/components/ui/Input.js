"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchInput = exports.Input = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const lucide_react_native_1 = require("lucide-react-native");
const inputVariants = (0, class_variance_authority_1.cva)('w-full rounded-lg border px-4 text-white font-normal', {
    variants: {
        variant: {
            default: 'border-dark-border bg-dark-elevated focus:border-intel-500',
            error: 'border-red-500 bg-dark-elevated',
            success: 'border-green-500 bg-dark-elevated',
        },
        size: {
            default: 'h-12 text-base',
            sm: 'h-10 text-sm',
            lg: 'h-14 text-lg',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});
exports.Input = react_1.default.forwardRef(({ className, containerClassName, variant, size, label, error, hint, leftIcon, rightIcon, secureTextEntry, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = (0, react_1.useState)(false);
    const [isFocused, setIsFocused] = (0, react_1.useState)(false);
    const actualVariant = error ? 'error' : variant;
    const showPasswordToggle = secureTextEntry !== undefined;
    return (<react_native_1.View className={(0, cn_1.cn)('w-full', containerClassName)}>
        {label && (<react_native_1.Text className="mb-1.5 text-sm font-medium text-white">{label}</react_native_1.Text>)}
        <react_native_1.View className="relative">
          {leftIcon && (<react_native_1.View className="absolute left-4 top-0 bottom-0 justify-center z-10">
              {leftIcon}
            </react_native_1.View>)}
          <react_native_1.TextInput ref={ref} className={(0, cn_1.cn)(inputVariants({ variant: actualVariant, size }), leftIcon && 'pl-12', (rightIcon || showPasswordToggle) && 'pr-12', isFocused && 'border-intel-500', className)} placeholderTextColor="#71717a" secureTextEntry={secureTextEntry && !isPasswordVisible} onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
        }} onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
        }} {...props}/>
          {showPasswordToggle && (<react_native_1.TouchableOpacity className="absolute right-4 top-0 bottom-0 justify-center" onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              {isPasswordVisible ? (<lucide_react_native_1.EyeOff size={20} color="#71717a"/>) : (<lucide_react_native_1.Eye size={20} color="#71717a"/>)}
            </react_native_1.TouchableOpacity>)}
          {rightIcon && !showPasswordToggle && (<react_native_1.View className="absolute right-4 top-0 bottom-0 justify-center">
              {rightIcon}
            </react_native_1.View>)}
        </react_native_1.View>
        {error && <react_native_1.Text className="mt-1 text-sm text-red-500">{error}</react_native_1.Text>}
        {hint && !error && (<react_native_1.Text className="mt-1 text-sm text-dark-muted">{hint}</react_native_1.Text>)}
      </react_native_1.View>);
});
exports.Input.displayName = 'Input';
// Search Input variant
exports.SearchInput = react_1.default.forwardRef(({ className, ...props }, ref) => {
    return (<exports.Input ref={ref} className={(0, cn_1.cn)('rounded-full', className)} placeholder="Search..." returnKeyType="search" {...props}/>);
});
exports.SearchInput.displayName = 'SearchInput';
