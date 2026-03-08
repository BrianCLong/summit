"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Switch = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const cn_1 = require("@/utils/cn");
const Switch = ({ checked = false, onCheckedChange, label, description, className, disabled, ...props }) => {
    return (<react_native_1.View className={(0, cn_1.cn)('flex-row items-center justify-between', className)}>
      {(label || description) && (<react_native_1.View className="flex-1 mr-4">
          {label && (<react_native_1.Text className={(0, cn_1.cn)('text-base text-white', disabled && 'opacity-50')}>
              {label}
            </react_native_1.Text>)}
          {description && (<react_native_1.Text className={(0, cn_1.cn)('text-sm text-dark-muted mt-0.5', disabled && 'opacity-50')}>
              {description}
            </react_native_1.Text>)}
        </react_native_1.View>)}
      <react_native_1.Switch value={checked} onValueChange={onCheckedChange} disabled={disabled} trackColor={{ false: '#27272a', true: '#0284c7' }} thumbColor={checked ? '#fff' : '#71717a'} ios_backgroundColor="#27272a" {...props}/>
    </react_native_1.View>);
};
exports.Switch = Switch;
