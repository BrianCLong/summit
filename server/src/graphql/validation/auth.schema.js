"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resetPasswordSchema = exports.requestPasswordResetSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Password Validation Rules
const passwordSchema = zod_1.z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').transform((val) => val.toLowerCase()),
    password: passwordSchema,
    username: zod_1.z.string().optional(),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').transform((val) => val.toLowerCase()),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.requestPasswordResetSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    newPassword: passwordSchema,
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
});
