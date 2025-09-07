Apache vhost templates for Maestro and IntelGraph behind Cloudflare (Full/Strict) using Cloudflare Origin CA.

Usage

- Copy the appropriate template to `/etc/apache2/sites-available/<host>.conf`.
- Create `/etc/ssl/cloudflare/` and place your Origin CA cert/key there.
- Enable required modules: `a2enmod ssl headers proxy proxy_http rewrite`.
- `apachectl configtest && systemctl reload apache2`.

Notes

- Do NOT set an intermediate chain for Cloudflare Origin CA.
- Keep DNS orange‑clouded; Origin CA is trusted by Cloudflare, not browsers.
- Ensure `/graphql` POST is proxied to backend and SPA fallback only applies to unknown routes.
