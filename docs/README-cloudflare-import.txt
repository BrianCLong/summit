Cloudflare DNS import for topicality.co  (generated 2025090401)

FILES
=====
1) topicality.co.keep-squarespace.bind
   - Keeps Squarespace website at apex + www (four Squarespace A records and www CNAME)
   - Adds Cloudflare Tunnel CNAMEs for dev/staging/prod/argocd
   - Keeps Google Workspace MX/SPF and DKIM placeholder

2) topicality.co.all-tunnel.bind
   - Routes apex + www + subdomains through your Cloudflare Tunnel (CNAME at apex is fine; Cloudflare flattens it)
   - Keeps Google Workspace MX/SPF and DKIM placeholder

3) topicality.co.tunnel-subdomains-only.bind
   - Adds only the dev/staging/prod/argocd CNAMEs (use if you already have the rest of your DNS in Cloudflare and just want the tunnel hosts)

BEFORE IMPORT
=============
- Replace TUNNEL_UUID with your actual tunnel UUID (cloudflared tunnel list)
- Paste your DKIM public key in the google._domainkey TXT if you plan to manage DKIM in Cloudflare now
- Update the 'googledomains-verification' TXT or remove it if you don't use it

HOW TO IMPORT
=============
Cloudflare Dashboard → DNS → Records → Import and Export → Import BIND file → upload the chosen file.
After import, set Proxy status (orange cloud) = Proxied for any hostnames you want fronted by Cloudflare/Tunnel.

CUTOVER
=======
At your registrar (Squarespace/Google):
- Disable DNSSEC (remove DS) *before* changing nameservers
- Change nameservers to the two Cloudflare NS shown in your zone
- Wait for the zone to show 'Active' in Cloudflare, then re-enable DNSSEC in Cloudflare if desired

VERIFY
======
dig NS topicality.co +short
dig CNAME dev.topicality.co +short
