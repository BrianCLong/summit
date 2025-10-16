export function hostCaps(capsToken: string) {
  const claims: any = verifyCapToken(capsToken);
  return {
    cas_read: async (digest: string) => {
      if (!claims.caps.includes('cas.read'))
        throw new Error('cap missing'); /* fetch & stream */
    },
    cas_write: async (bytes: Uint8Array) => {
      if (!claims.caps.includes('cas.write'))
        throw new Error('cap missing'); /* putCAS using DEK */
    },
  };
}
