import { isWaived } from '../security_audit_gate.mjs';

describe('Security Audit Gate', () => {
    describe('isWaived', () => {
        const mockAdvisory = {
            module_name: 'example-pkg',
            github_advisory_id: 'GHSA-1234-5678-9012',
            severity: 'high',
            title: 'Sample Vulnerability'
        };

        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);

        it('returns false if no waiver matches', () => {
            const waivers = [
                { package: 'other-pkg', advisory_id: 'GHSA-0000', rationale: 'Different pkg' }
            ];
            const result = isWaived(mockAdvisory, waivers);
            expect(result.waived).toBe(false);
        });

        it('returns true if waiver matches', () => {
            const waivers = [
                { package: 'example-pkg', advisory_id: 'GHSA-1234-5678-9012', rationale: 'Test waiver' }
            ];
            const result = isWaived(mockAdvisory, waivers);
            expect(result.waived).toBe(true);
        });

        it('returns false if waiver is expired', () => {
            const waivers = [
                { 
                    package: 'example-pkg', 
                    advisory_id: 'GHSA-1234-5678-9012', 
                    expires: pastDate.toISOString(),
                    rationale: 'Expired waiver' 
                }
            ];
            const result = isWaived(mockAdvisory, waivers);
            expect(result.waived).toBe(false);
        });

        it('returns true if waiver is not expired', () => {
            const waivers = [
                { 
                    package: 'example-pkg', 
                    advisory_id: 'GHSA-1234-5678-9012', 
                    expires: futureDate.toISOString(),
                    rationale: 'Valid waiver' 
                }
            ];
            const result = isWaived(mockAdvisory, waivers);
            expect(result.waived).toBe(true);
        });
    });
});
