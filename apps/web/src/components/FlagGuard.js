"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlagGuard = FlagGuard;
const react_1 = __importDefault(require("react"));
const AuthContext_1 = require("@/contexts/AuthContext");
const useRbac_1 = require("@/hooks/useRbac");
const DisabledOverlay_1 = require("./DisabledOverlay");
function FlagGuard({ required, children, fallback }) {
    const { user, loading: authLoading } = (0, AuthContext_1.useAuth)();
    const { hasAllPermissions, loading: rbacLoading } = (0, useRbac_1.useRbacMultiple)(required, {
        user,
        fallback: false
    });
    if (authLoading || rbacLoading) {
        return null;
    }
    if (!hasAllPermissions) {
        if (fallback)
            return <>{fallback}</>;
        return <DisabledOverlay_1.DisabledOverlay>{children}</DisabledOverlay_1.DisabledOverlay>;
    }
    return <>{children}</>;
}
