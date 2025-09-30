import fetch from 'node-fetch';
const AUTH='https://login.microsoftonline.com';

export function msAuthUrl(state:string){
  const p = new URL(`${AUTH}/${process.env.MS_OAUTH_TENANT_ID}/oauth2/v2.0/authorize`);
  p.searchParams.set('client_id', process.env.MS_OAUTH_CLIENT_ID!);
  p.searchParams.set('response_type','code');
  p.searchParams.set('redirect_uri', process.env.MS_OAUTH_REDIRECT!);
  p.searchParams.set('scope','offline_access https://graph.microsoft.com/.default');
  p.searchParams.set('state', state);
  return p.toString();
}
export async function msTokens(code:string){
  const u = `${AUTH}/${process.env.MS_OAUTH_TENANT_ID}/oauth2/v2.0/token`;
  const r = await fetch(u,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: process.env.MS_OAUTH_CLIENT_ID!,
      client_secret: process.env.MS_OAUTH_CLIENT_SECRET!,
      grant_type:'authorization_code',
      code,
      redirect_uri: process.env.MS_OAUTH_REDIRECT!
    })
  });
  if(!r.ok) throw new Error('ms token exchange failed');
  return r.json(); // {access_token, refresh_token, expires_in, ...}
}
export async function msRefresh(refresh_token:string){
  const u = `${AUTH}/${process.env.MS_OAUTH_TENANT_ID}/oauth2/v2.0/token`;
  const r = await fetch(u,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: process.env.MS_OAUTH_CLIENT_ID!,
      client_secret: process.env.MS_OAUTH_CLIENT_SECRET!,
      grant_type:'refresh_token',
      refresh_token
    })
  });
  if(!r.ok) throw new Error('ms token refresh failed');
  return r.json();
}