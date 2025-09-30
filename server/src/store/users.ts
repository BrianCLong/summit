// Replace with your real user store/ORM.
type Provider = 'google'|'microsoft';
export async function listConnectedUsers({ provider }:{ provider:Provider }){
  // e.g., SELECT id FROM identities WHERE provider=$1 AND active=true
  return [{ id: 'demo-user' }]; // stub
}