import { Address4, Address6 } from 'ip-address';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * Validates a URL to prevent SSRF attacks.
 * Checks for private IP ranges and valid protocols.
 * Returns the resolved IP address to prevent DNS rebinding.
 *
 * @param url The URL to validate
 * @returns The resolved IP address
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

  let hostname = parsedUrl.hostname;

  // Remove brackets for IPv6 check if present
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // 2. Check if hostname is already an IP
  if (Address4.isValid(hostname) || Address6.isValid(hostname)) {
    checkIp(hostname);
    return hostname;
  }

  // 3. DNS Resolution & IP Check
  try {
    // lookup returns the first address found
    // family: 0 means IPv4 or IPv6
    const result = await lookup(hostname, { family: 0 });
    const ipToValidate = result.address;
    checkIp(ipToValidate);
    return ipToValidate;
  } catch (error: any) {
    if (error.message && error.message.includes('Unsafe IP')) {
        throw error;
    }
    throw new Error(`DNS lookup failed for ${hostname}: ${error.message || String(error)}`);
  }
}

function checkIp(ip: string): void {
  if (Address4.isValid(ip)) {
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
  } else if (Address6.isValid(ip)) {
     const addr = new Address6(ip);

     if (
         addr.isLoopback() || // ::1
         addr.isLinkLocal() || // fe80::/10
         addr.isMulticast() // ff00::/8
     ) {
         throw new Error(`Unsafe IP address blocked: ${ip}`);
     }

     const parts = addr.parsedAddress; // 8 parts of hex strings

     // Helper to get hex value of part i
     const p = (i: number) => parseInt(parts[i], 16);

     // ::/128 (Unspecified)
     if (parts.every(x => parseInt(x, 16) === 0)) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // Unique Local: fc00::/7 (fc00-fdff)
     if ((p(0) & 0xfe00) === 0xfc00) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // Site Local: fec0::/10 (deprecated)
     if ((p(0) & 0xffc0) === 0xfec0) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // IPv4 Mapped: ::ffff:0:0/96
     if (parts.slice(0, 5).every(x => parseInt(x, 16) === 0) && p(5) === 0xffff) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // IPv4 Compatible: ::0.0.0.0/96 (deprecated)
     // Covered by ::/128 if all zero, but if last 32 bits are not zero:
     if (parts.slice(0, 6).every(x => parseInt(x, 16) === 0) && (p(6) !== 0 || p(7) !== 0)) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // Discard: 100::/64
     if (p(0) === 0x0100 && parts.slice(1, 4).every(x => parseInt(x, 16) === 0)) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // Teredo: 2001::/32
     if (p(0) === 0x2001 && p(1) === 0x0000) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // ORCHIDv2: 2001:20::/28
     if (p(0) === 0x2001 && p(1) >= 0x0020 && p(1) <= 0x002f) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // Documentation: 2001:db8::/32
     if (p(0) === 0x2001 && p(1) === 0x0db8) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // 6to4: 2002::/16
     if (p(0) === 0x2002) throw new Error(`Unsafe IP address blocked: ${ip}`);

     // 64:ff9b::/96 (IPv4-Embedded)
     if (p(0) === 0x0064 && p(1) === 0xff9b && parts.slice(2, 6).every(x => parseInt(x, 16) === 0)) throw new Error(`Unsafe IP address blocked: ${ip}`);
  }
}
