import express from 'express';
import { googleAuthUrl, googleTokens } from '../auth/google';
import { msAuthUrl, msTokens } from '../auth/microsoft';
import { saveIdentityTokens } from '../store/identity';

export const oauth = express.Router();

oauth.get('/oauth/google/start',(req,res)=>{
  const url = googleAuthUrl(req.query.state as string || 'init');
  res.redirect(url);
});
oauth.get('/oauth/google/callback', async (req,res)=>{
  const code = req.query.code as string;
  const tokens = await googleTokens(code);
  await saveIdentityTokens({ provider:'google', userId:req.user.id, tokens });
  res.send('Google connected. You can close this window.');
});

oauth.get('/oauth/ms/start',(req,res)=>{
  res.redirect(msAuthUrl(req.query.state as string || 'init'));
});
oauth.get('/oauth/ms/callback', async (req,res)=>{
  const code = req.query.code as string;
  const tokens = await msTokens(code);
  await saveIdentityTokens({ provider:'microsoft', userId:req.user.id, tokens });
  res.send('Microsoft connected. You can close this window.');
});