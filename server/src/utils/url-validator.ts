import { URL } from 'url';
import ip from 'ip';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

/**
 * Validates a webhook URL to prevent SSRF attacks.
 * Checks for private IP ranges and reserved addresses.
 *
 * @param url The URL to validate
 * @returns true if valid, throws error if invalid
 */
export async function validateWebhookUrl(url: string): Promise<boolean> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  const hostname = parsedUrl.hostname;

  // Block localhost directly
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
    throw new Error('Internal addresses are not allowed');
  }

  // Resolve hostname to IP
  let addresses: string[] = [];
  try {
    // If hostname is already an IP, resolve4 might fail or return it.
    // ip.isV4Format check can skip DNS
    if (ip.isV4Format(hostname)) {
      addresses = [hostname];
    } else {
      addresses = await resolve4(hostname);
    }
  } catch (error) {
    // If DNS resolution fails, we can't trust it
    throw new Error(`Failed to resolve hostname: ${hostname}`);
  }

  // Check each resolved IP
  for (const address of addresses) {
    if (ip.isPrivate(address)) {
      throw new Error(`URL resolves to a private IP address: ${address}`);
    }
    // Check for reserved ranges (like AWS metadata service)
    // 169.254.0.0/16 is link-local, ip.isPrivate usually covers it?
    // ip.isPrivate covers:
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    // It might NOT cover 169.254.x.x (Link Local) depending on library version.
    // Let's add explicit check for link-local
    if (address.startsWith('169.254.')) {
      throw new Error('Link-local addresses are not allowed');
    }
    // Loopback check
    if (ip.isLoopback(address)) {
       throw new Error('Loopback addresses are not allowed');
    }
  }

  return true;
}
