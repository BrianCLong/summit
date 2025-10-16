# Observability Embeds & CSP

## Overview

The IntelGraph platform supports embedding external observability tools (Grafana, Tempo, Prometheus) directly in the UI using iframes, or linking to them externally based on Content Security Policy (CSP) requirements.

## Configuration

### Environment Variables

```bash
# URLs for observability tools
VITE_OBS_GRAFANA_URL=https://grafana.company.com/dashboard
VITE_OBS_TEMPO_URL=https://tempo.company.com/explore
VITE_OBS_PROM_URL=https://prometheus.company.com/graph

# Embedding control (build-time setting)
VITE_OBS_EMBED=true   # Use iframes (default)
VITE_OBS_EMBED=false  # Use external links only
```

### CSP Considerations

#### When to Use Embeds (`VITE_OBS_EMBED=true`)

✅ **Safe to embed when:**

- You control both IntelGraph and observability tool domains
- Observability tools are configured with proper `X-Frame-Options` or `frame-ancestors`
- CSP allows `frame-src` for the observability domains
- Tools support signed/authenticated embeds

#### When to Use Links (`VITE_OBS_EMBED=false`)

🔒 **Use links when:**

- Strict CSP policies prohibit iframe embedding
- Observability tools are on third-party domains
- Security policies require external tool access
- Tools don't support embedded views

## CSP Configuration Examples

### Permissive CSP (Allows Embeds)

```http
Content-Security-Policy:
  default-src 'self';
  frame-src 'self' https://grafana.company.com https://tempo.company.com https://prometheus.company.com;
  script-src 'self' 'unsafe-inline';
```

### Strict CSP (Links Only)

```http
Content-Security-Policy:
  default-src 'self';
  frame-src 'none';
  script-src 'self';
```

## Tool-Specific Setup

### Grafana

```bash
# In grafana.ini
[security]
allow_embedding = true

# For signed embeds (recommended)
[auth.anonymous]
enabled = true
org_role = Viewer

# Set frame-ancestors for your IntelGraph domain
[security]
frame_ancestors = https://intelgraph.company.com
```

### Tempo/Jaeger

```bash
# Configure frame-ancestors in reverse proxy (nginx/apache)
# Tempo doesn't have built-in frame controls
add_header X-Frame-Options "SAMEORIGIN";
add_header Content-Security-Policy "frame-ancestors 'self' https://intelgraph.company.com";
```

### Prometheus

```bash
# Use --web.external-url for proper embedding
--web.external-url=https://prometheus.company.com/
--web.route-prefix=/

# Configure reverse proxy for frame control
add_header X-Frame-Options "SAMEORIGIN";
```

## Security Best Practices

### 1. Use Authenticated Embeds

- Configure observability tools with authentication
- Use signed URLs or session-based access
- Avoid embedding tools with sensitive data publicly

### 2. Domain Validation

```javascript
// Example iframe validation
const allowedDomains = [
  'grafana.company.com',
  'tempo.company.com',
  'prometheus.company.com',
];

const isValidUrl = (url) => {
  try {
    const domain = new URL(url).hostname;
    return allowedDomains.includes(domain);
  } catch {
    return false;
  }
};
```

### 3. Sandbox Attributes

The ObservabilityPanel uses secure sandbox attributes:

```jsx
<iframe
  sandbox="allow-same-origin allow-scripts"
  src={validatedUrl}
  title="observability-tool"
/>
```

### 4. Content Validation

- Validate all URLs before embedding
- Use allowlists for approved observability domains
- Implement URL sanitization

## Deployment Strategies

### Development Environment

```bash
# Relaxed CSP for development
VITE_OBS_EMBED=true
CSP_FRAME_SRC="'self' https://*.localhost:*"
```

### Staging Environment

```bash
# Test both modes
VITE_OBS_EMBED=true  # Test embeds
# OR
VITE_OBS_EMBED=false # Test link fallbacks
```

### Production Environment

```bash
# Strict CSP recommended
VITE_OBS_EMBED=false
CSP_FRAME_SRC="'none'"
# OR carefully configured embeds with specific domains
```

## Troubleshooting

### Common Issues

**1. "Refused to display in a frame"**

- Check `X-Frame-Options` on observability tool
- Verify `frame-ancestors` CSP directive
- Ensure domains match exactly (including subdomains)

**2. Blank iframe content**

- Verify authentication/session state
- Check browser developer tools for CSP violations
- Test URL directly in new tab

**3. Cross-origin errors**

- Configure CORS properly on observability tools
- Use same-origin or properly configured cross-origin setup
- Consider using signed URLs

### Debug Mode

```bash
# Enable debug logging
VITE_DEBUG_CSP=true
```

This will log CSP violations and iframe loading issues to browser console.

## Implementation Details

The embedding logic is in `client/src/features/observability/ObservabilityPanel.tsx`:

- Respects `VITE_OBS_EMBED` environment variable
- Falls back to links when embed is disabled
- Uses secure iframe sandbox attributes
- Provides clear UX for both modes

The toggle is build-time only to ensure consistent behavior across environments and prevent runtime CSP conflicts.
