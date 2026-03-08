"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignSystemProvider = exports.applyTokenVariables = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const tokens_1 = require("./tokens");
const config_1 = require("@/config");
const hasDom = () => typeof document !== 'undefined';
const applyTokenVariables = (root, entries = tokens_1.designTokenEntries, overrides = {}) => {
    entries.forEach(([name, value]) => root.style.setProperty(`--${name}`, String(value)));
    Object.entries(overrides).forEach(([name, value]) => {
        root.style.setProperty(`--${name}`, String(value));
    });
};
exports.applyTokenVariables = applyTokenVariables;
const DesignSystemProvider = ({ children, enableTokens, tokenOverrides, }) => {
    const shouldEnable = enableTokens ?? (0, config_1.isFeatureEnabled)('ui.tokensV1');
    react_1.default.useEffect(() => {
        if (!hasDom() || !shouldEnable) {
            return;
        }
        const root = document.documentElement;
        const previousFlag = root.dataset.uiTokens;
        const previousValues = new Map();
        const overrideEntries = Object.entries(tokenOverrides ?? {});
        const allEntries = [...tokens_1.designTokenEntries, ...overrideEntries];
        allEntries.forEach(([name]) => {
            const cssName = `--${name}`;
            previousValues.set(cssName, root.style.getPropertyValue(cssName));
        });
        (0, exports.applyTokenVariables)(root, tokens_1.designTokenEntries, tokenOverrides);
        root.dataset.uiTokens = 'v1';
        return () => {
            if (previousFlag) {
                root.dataset.uiTokens = previousFlag;
            }
            else {
                delete root.dataset.uiTokens;
            }
            previousValues.forEach((value, key) => {
                if (value) {
                    root.style.setProperty(key, value);
                }
                else {
                    root.style.removeProperty(key);
                }
            });
        };
    }, [shouldEnable, tokenOverrides]);
    return <>{children}</>;
};
exports.DesignSystemProvider = DesignSystemProvider;
