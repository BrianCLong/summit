import { Address4, Address6 } from 'ip-address';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * Validates an untrusted URL before any outbound OSINT fetch.
 *
 * Purpose:
 * - Reject non-HTTP(S) protocols.
 * - Resolve hostnames once and return the concrete IP to prevent DNS TOCTOU.
 * - Enforce a denylist of private, loopback, link-local, and reserved ranges.
 *
 * Inputs/Outputs:
 * - Input: arbitrary URL string from collector configuration.
 * - Output: a validated IPv4/IPv6 address that the caller can pin network I/O to.
 *
 * Security invariants:
 * - The returned value is always the same IP that passed safety validation.
 * - No private-range, loopback, link-local, multicast, or reserved destination is
 *   allowed.
 * - Hostnames are not returned to callers after validation.
 *
 * Failure modes:
 * - Throws `Error('Invalid URL format')` for malformed inputs.
 * - Throws `Error('Unsafe protocol: ...')` for non-HTTP(S) URLs.
 * - Throws `Error('Unsafe IP address blocked: ...')` for denied address ranges.
 * - Throws DNS lookup errors with hostname context for unresolved hosts.
 *
 * @param url The URL to validate
 * @returns Validated destination IP (literal or DNS-resolved)
 * @throws Error if URL is invalid or unsafe
 */
export async function validateSafeUrl(url: string): Promise<string> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // 1. Protocol Check
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsafe protocol: ${parsedUrl.protocol}`);
  }

  // 2. Hostname Check
  const hostname = stripIpv6Brackets(parsedUrl.hostname);

  // Check if hostname is already an IP
  if (Address4.isValid(hostname) || Address6.isValid(hostname)) {
    // It's an IP, validate it directly
    checkIp(hostname);
    return hostname;
  }

  // 3. DNS Resolution & IP Check
  try {
    // lookup returns the first address found
    const result = await lookup(hostname);
    const ipToValidate = result.address;
    checkIp(ipToValidate);
    return ipToValidate;
  } catch (error) {
    if ((error as Error).message.includes('Unsafe IP')) {
      throw error;
    }
    throw new Error(
      `DNS lookup failed for ${hostname}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Removes URL-bracket notation from IPv6 host literals.
 *
 * Purpose:
 * - Normalize host text so downstream IP validators receive canonical input.
 *
 * Inputs/Outputs:
 * - Input: `URL.hostname` value (which may contain `[ ]` for IPv6 literals).
 * - Output: hostname without wrapping brackets.
 *
 * Security invariants:
 * - Only strips leading/trailing bracket pair; does not otherwise mutate host text.
 *
 * Failure modes:
 * - No throws; returns original hostname if no wrapping bracket pair exists.
 *
 * @param hostname Parsed hostname from URL
 * @returns Hostname safe for IP format checks
 */
function stripIpv6Brackets(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

/**
 * Rejects destination IPs that can route traffic to non-public networks.
 *
 * Purpose:
 * - Block SSRF targets that expose internal services or bypass network boundaries.
 *
 * Inputs/Outputs:
 * - Input: destination IP string (v4 or v6).
 * - Output: none. Returns only when address is considered public-safe.
 *
 * Security invariants:
 * - Any IP in blocked ranges throws immediately.
 * - Unknown/invalid address formats are rejected to avoid fail-open behavior.
 *
 * Failure modes:
 * - Throws `Unsafe IP address blocked` for denied ranges.
 * - Throws `Invalid IP address` for malformed inputs.
 *
 * @param ip Destination IP address
 * @throws Error when address is unsafe or malformed
 */
function checkIp(ip: string): void {
  if (Address4.isValid(ip)) {
    // IPv4 Checks
    const octets = ip.split('.').map(Number);
    const o1 = octets[0];
    const o2 = octets[1];
    const o3 = octets[2];

    if (
      o1 === 0 || // 0.0.0.0/8
      o1 === 10 || // 10.0.0.0/8
      (o1 === 100 && (o2 & 192) === 64) || // 100.64.0.0/10
      o1 === 127 || // 127.0.0.0/8
      (o1 === 169 && o2 === 254) || // 169.254.0.0/16
      (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12
      (o1 === 192 && o2 === 0 && o3 === 0) || // 192.0.0.0/24
      (o1 === 192 && o2 === 0 && o3 === 2) || // 192.0.2.0/24
      (o1 === 192 && o2 === 88 && o3 === 99) || // 192.88.99.0/24
      (o1 === 192 && o2 === 168) || // 192.168.0.0/16
      (o1 === 198 && (o2 & 254) === 18) || // 198.18.0.0/15
      (o1 === 198 && o2 === 51 && o3 === 100) || // 198.51.100.0/24
      (o1 === 203 && o2 === 0 && o3 === 113) || // 203.0.113.0/24
      o1 >= 224 // Multicast (224.0.0.0/4) & Reserved (240.0.0.0/4)
    ) {
      throw new Error(`Unsafe IP address blocked: ${ip}`);
    }
    return;
  } else if (Address6.isValid(ip)) {
    const addr = new Address6(ip);

    if (
      addr.isLoopback() || // ::1
      addr.isLinkLocal() || // fe80::/10
      addr.isMulticast() // ff00::/8
    ) {
      throw new Error(`Unsafe IP address blocked: ${ip}`);
    }

    if (ip === '::' || ip === '0:0:0:0:0:0:0:0') {
      throw new Error(`Unsafe IP address blocked: ${ip}`); // ::/128
    }

    const canonical = addr.canonicalForm();
    if (canonical) {
      const cParts = canonical.split(':');
      const firstHex = parseInt(cParts[0], 16);

      // Unique Local: fc00::/7 => fcxx or fdxx
      if ((firstHex & 0xfe00) === 0xfc00) {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }

      // Mapped IPv4: ::ffff:0:0/96
      if (
        cParts[0] === '0000' &&
        cParts[1] === '0000' &&
        cParts[2] === '0000' &&
        cParts[3] === '0000' &&
        cParts[4] === '0000' &&
        cParts[5] === 'ffff'
      ) {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }

      // Discard-Only: 100::/64
      if (
        cParts[0] === '0100' &&
        cParts[1] === '0000' &&
        cParts[2] === '0000' &&
        cParts[3] === '0000'
      ) {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }

      // Teredo: 2001:0000::/32
      if (cParts[0] === '2001' && cParts[1] === '0000') {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }

      // ORCHIDv2: 2001:0020::/28
      const secondHex = parseInt(cParts[1], 16);
      if (cParts[0] === '2001' && secondHex >= 0x0020 && secondHex <= 0x002f) {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }

      // Documentation: 2001:0db8::/32
      if (cParts[0] === '2001' && cParts[1] === '0db8') {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }

      // 6to4: 2002::/16
      if (cParts[0] === '2002') {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }

      // IPv4-Embedded: 64:ff9b::/96
      if (
        cParts[0] === '0064' &&
        cParts[1] === 'ff9b' &&
        cParts[2] === '0000' &&
        cParts[3] === '0000' &&
        cParts[4] === '0000' &&
        cParts[5] === '0000'
      ) {
        throw new Error(`Unsafe IP address blocked: ${ip}`);
      }
    }
    return;
  }

  throw new Error(`Invalid IP address: ${ip}`);
}
