import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';

const lookup = promisify(dns.lookup);

/**
 * Validates a URL to prevent SSRF attacks.
 * Checks against private IP ranges, loopback, and link-local addresses.
 */
export async function validateUrl(url: string): Promise<string> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  const { protocol, hostname } = parsedUrl;

  // 1. Protocol Check
  if (!['http:', 'https:'].includes(protocol)) {
    throw new Error(`Protocol ${protocol} is not allowed. Only http/https.`);
  }

  // 2. DNS Resolution & IP Check
  // Note: This is a basic check. For robust protection against DNS rebinding,
  // the resolved IP should be used for the connection, not just checked.
  // However, axios doesn't easily support passing the IP while keeping the Host header
  // without custom agents. For this P0 fix, we validate here.

  // Resolve hostname
  let address: string;
  try {
      const result = await lookup(hostname);
      address = result.address;
  } catch (e) {
      // If DNS resolution fails, it might be an internal name or invalid.
      // BUT if the hostname looks like an IP, we check it directly.
      if (isIpAddress(hostname)) {
          address = hostname;
      } else {
         // Fail closed: If we can't resolve it, we can't verify it's not private.
         throw new Error('DNS resolution failed');
      }
  }

  if (isPrivateIp(address)) {
    throw new Error(`Target address ${address} is in a private/reserved range.`);
  }

  return url;
}

function isIpAddress(host: string): boolean {
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

function isPrivateIp(ip: string): boolean {
  if (ip === '::1') return true; // IPv6 loopback
  if (ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true; // IPv6 Unique Local
  if (ip.startsWith('fe80:')) return true; // IPv6 Link-local

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}
