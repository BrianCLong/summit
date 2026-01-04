import path from 'path';

/**
 * Validates and resolves a path to ensure it remains within a trusted directory.
 * Prevents Path Traversal (LFI) vulnerabilities.
 */
export function resolveSafePath(baseDir: string, untrustedPath: string): string {
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(resolvedBase, untrustedPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error(`Path traversal detected: ${untrustedPath} is outside ${baseDir}`);
    }

    if (untrustedPath.includes('\0')) {
        throw new Error('Invalid path: Null byte detected');
    }

    return resolvedTarget;
}

export function sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}
