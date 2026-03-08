"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Separator = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const cn_1 = require("@/utils/cn");
const Separator = ({ orientation = 'horizontal', className, ...props }) => {
    return (<react_native_1.View className={(0, cn_1.cn)('bg-dark-border', orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full', className)} {...props}/>);
};
exports.Separator = Separator;
