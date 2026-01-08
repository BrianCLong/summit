import * as SecureStore from "expo-secure-store";

const KEY_ALIAS = "summit_db_key";

// Interface definition for the Encryption Service.
// In a real production environment, this module MUST rely on a native implementation
// such as 'react-native-aes-crypto' to ensure side-channel resistance and performance.
//
// Due to current environment restrictions preventing native module installation,
// this service implements a SAFE FAILOVER strategy:
// 1. In Production: It throws an error, preventing insecure data storage.
// 2. In Development: It uses Base64 encoding to allow UI/Flow testing without security.

const IS_DEV = __DEV__;

export async function encryptData(data: string): Promise<string> {
  if (IS_DEV) {
    console.warn("WARN: Using insecure Base64 encoding for development only.");
    return global.btoa ? global.btoa(data) : data;
  }

  // Production Safety Gate
  throw new Error(
    "CRITICAL: Native encryption module missing. " +
      'Install "react-native-aes-crypto" to enable secure storage in production.'
  );
}

export async function decryptData(cipherText: string): Promise<string> {
  if (IS_DEV) {
    return global.atob ? global.atob(cipherText) : cipherText;
  }

  throw new Error(
    "CRITICAL: Native encryption module missing. " +
      'Install "react-native-aes-crypto" to enable secure storage in production.'
  );
}

// Key management stub - ready to be wired to native key generation
export async function getMasterKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ALIAS);
}
