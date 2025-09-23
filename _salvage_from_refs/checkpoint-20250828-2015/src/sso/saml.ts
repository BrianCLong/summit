import express from 'express';
import { Strategy as SamlStrategy } from ' @node-saml/passport-saml';
import passport from 'passport';
import { findOrgByDomain, upsertUserFromSso } from './util';

export function samlRoutes() {
  const r = express.Router();

  r.get('/metadata/:orgId', (req, res) => {
    // return SP metadata for org (entityID, ACS, certificates)
    res.type('application/xml').send(buildMetadata(req.params.orgId));
  });

  r.post('/acs/:orgId',
    passport.authenticate('saml', { failureRedirect: '/login?err=saml' }),
    async (req, res) => {
      import { ssoLogins, ssoErrors } from '../metrics/identity';
      try {
        const profile: any = req.user; // saml profile
        const org = await getOrg(req.params.orgId);
        const user = await upsertUserFromSso(org, {
          email: profile.nameID,
          name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || profile.displayName,
          groups: profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'] || [],
          attrs: profile
        });
        // create session/JWT and redirect to app
        const token = await createSession(user, org);
        ssoLogins.labels('saml', org.id).inc();
        res.redirect(`/post-login?token=${token}`);
      } catch (e) {
        ssoErrors.labels('saml', req.params.orgId, 'auth_failed').inc();
        res.redirect('/login?err=saml');
      }
    });

  return r;
}
