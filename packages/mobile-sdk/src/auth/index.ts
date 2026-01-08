import ReactNativeBiometrics from "react-native-biometrics";
import * as Keychain from "react-native-keychain";

export interface AuthConfig {
  baseUrl: string;
  tokenRefreshBuffer: number;
  biometricPromptMessage: string;
  keychainService: string;
}

const DEFAULT_CONFIG: Partial<AuthConfig> = {
  tokenRefreshBuffer: 30000,
  biometricPromptMessage: "Confirm your identity",
  keychainService: "intelgraph_auth",
};

export class AuthService {
  private config: AuthConfig;
  private rnBiometrics: ReactNativeBiometrics;

  constructor(config: AuthConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rnBiometrics = new ReactNativeBiometrics();
  }

  // Biometrics
  async isBiometricsAvailable(): Promise<{ available: boolean; biometryType?: string }> {
    const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
    return { available, biometryType };
  }

  async enableBiometrics(): Promise<boolean> {
    try {
      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: this.config.biometricPromptMessage,
      });
      return success;
    } catch {
      return false;
    }
  }

  async authenticateWithBiometrics(message?: string): Promise<boolean> {
    try {
      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: message || this.config.biometricPromptMessage,
      });
      return success;
    } catch {
      return false;
    }
  }

  // Secure Storage
  async saveCredentials(username: string, token: string): Promise<boolean> {
    const result = await Keychain.setGenericPassword(username, token, {
      service: this.config.keychainService,
    });
    return !!result;
  }

  async getCredentials(): Promise<{ username: string; password: string } | null> {
    const credentials = await Keychain.getGenericPassword({
      service: this.config.keychainService,
    });
    if (credentials) {
      return { username: credentials.username, password: credentials.password };
    }
    return null;
  }

  async clearCredentials(): Promise<boolean> {
    return await Keychain.resetGenericPassword({
      service: this.config.keychainService,
    });
  }
}
