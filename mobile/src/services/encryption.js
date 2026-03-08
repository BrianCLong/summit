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
exports.encryptData = encryptData;
exports.decryptData = decryptData;
exports.getMasterKey = getMasterKey;
const SecureStore = __importStar(require("expo-secure-store"));
const KEY_ALIAS = 'summit_db_key';
// Interface definition for the Encryption Service.
// In a real production environment, this module MUST rely on a native implementation
// such as 'react-native-aes-crypto' to ensure side-channel resistance and performance.
//
// Due to current environment restrictions preventing native module installation,
// this service implements a SAFE FAILOVER strategy:
// 1. In Production: It throws an error, preventing insecure data storage.
// 2. In Development: It uses Base64 encoding to allow UI/Flow testing without security.
const IS_DEV = __DEV__;
async function encryptData(data) {
    if (IS_DEV) {
        console.warn('WARN: Using insecure Base64 encoding for development only.');
        return global.btoa ? global.btoa(data) : data;
    }
    // Production Safety Gate
    throw new Error('CRITICAL: Native encryption module missing. ' +
        'Install "react-native-aes-crypto" to enable secure storage in production.');
}
async function decryptData(cipherText) {
    if (IS_DEV) {
        return global.atob ? global.atob(cipherText) : cipherText;
    }
    throw new Error('CRITICAL: Native encryption module missing. ' +
        'Install "react-native-aes-crypto" to enable secure storage in production.');
}
// Key management stub - ready to be wired to native key generation
async function getMasterKey() {
    return SecureStore.getItemAsync(KEY_ALIAS);
}
