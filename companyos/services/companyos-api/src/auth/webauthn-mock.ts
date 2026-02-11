export const WebAuthnMock = {
  generateRegistrationOptions: (userId: string) => ({
    challenge: "mock_challenge",
    rp: { name: "CompanyOS" },
    user: { id: userId, name: userId, displayName: userId },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
  }),
  verifyRegistrationResponse: (response: any) => ({
    verified: true,
    registrationInfo: { fmt: "none", counter: 0 },
  }),
  generateAuthenticationOptions: () => ({
    challenge: "mock_auth_challenge",
    allowCredentials: [],
  }),
  verifyAuthenticationResponse: (response: any) => ({
    verified: true,
    authenticationInfo: { counter: 1 },
  }),
};
