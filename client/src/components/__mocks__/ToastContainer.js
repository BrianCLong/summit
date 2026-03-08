"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToastProvider = exports.useToastHelpers = exports.useToast = void 0;
const react_1 = __importDefault(require("react"));
const useToast = () => ({
    addToast: jest.fn(),
    removeToast: jest.fn(),
    clearAllToasts: jest.fn(),
});
exports.useToast = useToast;
const useToastHelpers = () => ({
    success: () => 'mock-toast',
    error: () => 'mock-toast',
    warning: () => 'mock-toast',
    info: () => 'mock-toast',
});
exports.useToastHelpers = useToastHelpers;
const ToastProvider = ({ children }) => <>{children}</>;
exports.ToastProvider = ToastProvider;
