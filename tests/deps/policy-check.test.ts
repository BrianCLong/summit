
import path from 'path';
import fs from 'fs';
import { checkPinnedDeps, checkLicenses, Context, Config } from '../../tooling/deps/deps-policy-check';

describe('Dependency Policy Check', () => {
  const mockCwd = '/mock/cwd';

  const createMockContext = (files: Record<string, string>, execMock?: (cmd: string) => string): Context => {
    const ctx = {
      cwd: mockCwd,
      readFile: (p) => {
          const relPath = path.isAbsolute(p) ? path.relative(mockCwd, p) : p;
          if (files[relPath]) return files[relPath];
          throw new Error(`File not found: ${p}`);
      },
      exists: (p) => {
          const relPath = path.isAbsolute(p) ? path.relative(mockCwd, p) : p;
          return !!files[relPath];
      },
      exec: (cmd) => {
          if (execMock) return execMock(cmd);
          return '';
      },
      log: jest.fn(),
      error: jest.fn()
    } as any;

    // Mock findPackageJsons
    ctx.findPackageJsons = () => {
        // Return file keys that match package.json
        return Object.keys(files).filter(f => f.endsWith('package.json')).map(f => path.join(mockCwd, f));
    };

    return ctx;
  };

  describe('checkPinnedDeps', () => {
    it('should pass valid pinned git dependencies', () => {
      const files = {
        'pnpm-lock.yaml': '...',
        'package.json': JSON.stringify({
          dependencies: {
            "good-dep": "git+https://github.com/org/repo.git#1234567890abcdef1234567890abcdef12345678"
          }
        })
      };
      const context = createMockContext(files);

      const result = checkPinnedDeps(context, false);
      expect(result).toBe(true);
      expect(context.error).not.toHaveBeenCalled();
    });

    it('should fail unpinned git dependencies', () => {
      const files = {
        'pnpm-lock.yaml': '...',
        'package.json': JSON.stringify({
          dependencies: {
            "bad-dep": "git+https://github.com/org/repo.git" // Missing hash
          }
        })
      };
      const context = createMockContext(files);

      const result = checkPinnedDeps(context, false);
      expect(result).toBe(false);
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining("Dependency 'bad-dep' is not pinned"));
    });

    it('should warn-only on unpinned git dependencies if flag set', () => {
      const files = {
        'pnpm-lock.yaml': '...',
        'package.json': JSON.stringify({
          dependencies: {
            "bad-dep": "git+https://github.com/org/repo.git"
          }
        })
      };
      const context = createMockContext(files);

      const result = checkPinnedDeps(context, true); // warnOnly = true
      expect(result).toBe(true);
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining("Dependency 'bad-dep' is not pinned"));
    });
  });

  describe('checkLicenses', () => {
    const config: Config = {
        approved: ['MIT', 'Apache-2.0'],
        ignoredPackages: ['my-private-pkg']
    };

    it('should pass allowed licenses', () => {
        const licenseOutput = JSON.stringify({
            'MIT': [{ name: 'pkg-a', version: '1.0.0' }],
            'Apache-2.0': [{ name: 'pkg-b', version: '1.0.0' }]
        });

        const context = createMockContext({}, (cmd) => {
            if (cmd.includes('licenses list')) return licenseOutput;
            return '';
        });

        const result = checkLicenses(context, config, false);
        expect(result).toBe(true);
        expect(context.error).not.toHaveBeenCalled();
    });

    it('should fail disallowed licenses', () => {
        const licenseOutput = JSON.stringify({
            'GPL-3.0': [{ name: 'pkg-bad', version: '1.0.0' }]
        });

        const context = createMockContext({}, (cmd) => {
            if (cmd.includes('licenses list')) return licenseOutput;
            return '';
        });

        const result = checkLicenses(context, config, false);
        expect(result).toBe(false);
        expect(context.error).toHaveBeenCalledWith(expect.stringContaining("Violation: License 'GPL-3.0' is not in the approved list"));
    });

    it('should pass ignored packages with disallowed licenses', () => {
        const licenseOutput = JSON.stringify({
            'GPL-3.0': [{ name: 'my-private-pkg', version: '1.0.0' }]
        });

        const context = createMockContext({}, (cmd) => {
            if (cmd.includes('licenses list')) return licenseOutput;
            return '';
        });

        const result = checkLicenses(context, config, false);
        expect(result).toBe(true);
        expect(context.error).not.toHaveBeenCalled();
    });

    it('should handle OR expressions', () => {
        const licenseOutput = JSON.stringify({
            '(MIT OR GPL-3.0)': [{ name: 'pkg-dual', version: '1.0.0' }]
        });

        const context = createMockContext({}, (cmd) => {
            if (cmd.includes('licenses list')) return licenseOutput;
            return '';
        });

        const result = checkLicenses(context, config, false);
        expect(result).toBe(true);
    });
  });
});
