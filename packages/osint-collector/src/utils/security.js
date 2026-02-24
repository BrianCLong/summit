import { Address4, Address6 } from 'ip-address';
import dns from 'dns';
import { promisify } from 'util';
const lookup = promisify(dns.lookup);
/**
 * Validates a URL to prevent SSRF attacks.
 * Checks for private IP ranges and valid protocols.
 *
 * @param url The URL to validate
 * @throws Error if URL is invalid or unsafe
 */
export async function validateSafeUrl(url) {
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    }
    catch {
        throw new Error('Invalid URL format');
    }
    // 1. Protocol Check
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`Unsafe protocol: ${parsedUrl.protocol}`);
    }
    // 2. Hostname Check
    let hostname = parsedUrl.hostname;
    // Remove brackets for IPv6 check if present
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1);
    }
    // Check if hostname is an IP (IPv4 or IPv6)
    if (Address4.isValid(hostname)) {
        checkIp(hostname);
        return;
    }
    if (Address6.isValid(hostname)) {
        checkIp(hostname);
        return;
    }
    // 3. DNS Resolution & IP Check
    try {
        // lookup returns the first address found
        const result = await lookup(hostname);
        // Note: There is a Time-of-Check Time-of-Use (TOCTOU) race condition here.
        // The IP resolved here might differ from the one used by fetch() due to DNS rebinding.
        // For a robust fix, we would need a custom HTTP Agent that uses the resolved IP.
        checkIp(result.address);
    }
    catch (error) {
        if (error.message.includes('Unsafe IP')) {
            throw error;
        }
        throw new Error(`DNS lookup failed for ${hostname}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function checkIp(ip) {
    // Check IPv4
    if (Address4.isValid(ip)) {
        // Private ranges:
        // 10.0.0.0/8
        // 172.16.0.0/12
        // 192.168.0.0/16
        // 127.0.0.0/8 (Loopback)
        // 169.254.0.0/16 (Link-local)
        // 0.0.0.0/8
        if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('169.254.') || ip.startsWith('192.168.') || ip.startsWith('0.')) {
            throw new Error(`Unsafe IP address blocked: ${ip}`);
        }
        // 172.16.0.0 - 172.31.255.255
        if (ip.startsWith('172.')) {
            const parts = ip.split('.');
            const secondOctet = parseInt(parts[1], 10);
            if (secondOctet >= 16 && secondOctet <= 31) {
                throw new Error(`Unsafe IP address blocked: ${ip}`);
            }
        }
        return;
    }
    // Check IPv6
    if (Address6.isValid(ip)) {
        const addr = new Address6(ip);
        // Block Loopback (::1) and unspecified (::)
        if (addr.isLoopback() || ip === '::' || ip === '::1') {
            throw new Error(`Unsafe IP address blocked: ${ip}`);
        }
        // Block Unique Local (fc00::/7) and Link-local (fe80::/10)
        // Use canonical form for checking if possible, or just start checks.
        // ip-address Address6.getCanonicalForm()
        let canonical = ip;
        try {
            canonical = addr.to4().address; // If it's a 6to4 or mapped, this helps? No.
        }
        catch (e) {
            // ignore
        }
        // Simple string checks on the input IP (which comes from dns.lookup or URL)
        const lowerIp = ip.toLowerCase();
        // fc00::/7 -> fc, fd
        if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) {
            throw new Error(`Unsafe IP address blocked: ${ip}`);
        }
        // fe80::/10 -> fe8, fe9, fea, feb
        if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) {
            throw new Error(`Unsafe IP address blocked: ${ip}`);
        }
        // IPv4 mapped IPv6: ::ffff:1.2.3.4
        if (lowerIp.includes('::ffff:')) {
            throw new Error(`IPv4-mapped IPv6 addresses are blocked: ${ip}`);
        }
    }
}
//# sourceMappingURL=security.js.map