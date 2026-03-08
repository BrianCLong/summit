// In v1, eligibility is a mock value simulating whether a brand is theoretically discoverable
export class EligibilityScorer {
    public score(brandName: string, promptClass: string): number {
        // Placeholder implementation for v1
        if (brandName.toLowerCase() === 'unknownbrand') return 0.1;
        return 0.9;
    }
}
