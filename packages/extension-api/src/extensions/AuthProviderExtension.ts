import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Authentication provider extension point
 */
export interface AuthProviderExtension extends ExtensionPoint<AuthRequest, AuthResult> {
  type: 'auth-provider';
  providerName: string;
  authenticate(credentials: any): Promise<AuthResult>;
  validate(token: string): Promise<boolean>;
  refresh(refreshToken: string): Promise<AuthResult>;
}

export interface AuthRequest {
  credentials: any;
  type: 'login' | 'validate' | 'refresh';
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
  expiresAt?: Date;
  error?: string;
}

export abstract class BaseAuthProviderExtension implements AuthProviderExtension {
  readonly type = 'auth-provider' as const;

  constructor(
    public readonly id: string,
    public readonly providerName: string
  ) {}

  abstract authenticate(credentials: any): Promise<AuthResult>;
  abstract validate(token: string): Promise<boolean>;
  abstract refresh(refreshToken: string): Promise<AuthResult>;

  async execute(request: AuthRequest): Promise<AuthResult> {
    switch (request.type) {
      case 'login':
        return this.authenticate(request.credentials);
      case 'validate':
        const valid = await this.validate(request.credentials.token);
        return { success: valid };
      case 'refresh':
        return this.refresh(request.credentials.refreshToken);
      default:
        return { success: false, error: 'Unknown request type' };
    }
  }
}
