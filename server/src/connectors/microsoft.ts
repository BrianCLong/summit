import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

export function graphClient(accessToken: string) {
  return Client.init({ authProvider: (done)=> done(null, accessToken) });
}