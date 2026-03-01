export async function syncScimUsers() {
  // SECURITY(P0): RESOLVED via safe-disable: SCIM sync not implemented yet.
  // Throws 501 Not Implemented instead of failing silently.
  const error = new Error('Not Implemented: SCIM sync is not yet available');
  (error as any).status = 501;
  throw error;
}
