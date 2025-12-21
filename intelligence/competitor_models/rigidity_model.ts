// Models competitor rigidity based on their regulatory capture
export class RigidityModel {
    calculateRigidity(competitor: string): number {
        // Higher score = more rigid/captured
        return 0.9;
    }
}
