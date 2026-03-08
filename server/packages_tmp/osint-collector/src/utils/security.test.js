"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const security_js_1 = require("./security.js");
(0, globals_1.describe)('validateSafeUrl', () => {
    (0, globals_1.it)('should allow valid public URLs', async () => {
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('https://www.google.com')).resolves.not.toThrow();
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://example.com/foo/bar')).resolves.not.toThrow();
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('https://8.8.8.8/dns-query')).resolves.not.toThrow();
    });
    (0, globals_1.it)('should block invalid protocols', async () => {
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('ftp://example.com')).rejects.toThrow('Unsafe protocol');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('file:///etc/passwd')).rejects.toThrow('Unsafe protocol');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('gopher://example.com')).rejects.toThrow('Unsafe protocol');
    });
    (0, globals_1.it)('should block private IPv4 addresses', async () => {
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://127.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://10.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://192.168.1.1')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://169.254.169.254')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://172.16.0.1')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://172.31.255.255')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://0.0.0.0')).rejects.toThrow('Unsafe IP address blocked');
    });
    (0, globals_1.it)('should block private IPv6 addresses', async () => {
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://[::1]')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://[fc00::1]')).rejects.toThrow('Unsafe IP address blocked');
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://[fe80::1]')).rejects.toThrow('Unsafe IP address blocked');
    });
    (0, globals_1.it)('should block DNS rebinding to private IP (simulated via mocking or known localhost)', async () => {
        // localhost typically resolves to 127.0.0.1 or ::1
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://localhost')).rejects.toThrow('Unsafe IP address blocked');
    });
    (0, globals_1.it)('should allow public non-private IPs (edge cases)', async () => {
        // 1.1.1.1 is Cloudflare DNS
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://1.1.1.1')).resolves.not.toThrow();
        // 172.32.0.1 is public
        await (0, globals_1.expect)((0, security_js_1.validateSafeUrl)('http://172.32.0.1')).resolves.not.toThrow();
    });
});
