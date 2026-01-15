// Mock for jsonwebtoken
export const sign = (payload: object, secret: string, options?: object): string => {
  return 'mock-jwt-token';
};

export const verify = (token: string, secret: string, options?: object): object => {
  return { sub: 'test-user', iat: Date.now() };
};

export const decode = (token: string): object | null => {
  return { sub: 'test-user', iat: Date.now() };
};

export type JwtPayload = {
  sub?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
};

export type Algorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';

const jwt = {
  sign,
  verify,
  decode,
};

export default jwt;
