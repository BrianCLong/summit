"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFeatureFlag = useFeatureFlag;
exports.useFeatureVariant = useFeatureVariant;
const FeatureFlagContext_1 = require("../contexts/FeatureFlagContext");
function useFeatureFlag(key, defaultValue = false) {
    const { isEnabled } = (0, FeatureFlagContext_1.useFeatureFlags)();
    return isEnabled(key, defaultValue);
}
function useFeatureVariant(key, defaultValue) {
    const { getVariant } = (0, FeatureFlagContext_1.useFeatureFlags)();
    return getVariant(key, defaultValue);
}
