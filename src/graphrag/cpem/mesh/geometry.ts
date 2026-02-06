import { FICFZone } from '../canonical/ficf';
import { SICFSensor } from '../canonical/sicf';

export function computeLineOfSight(sensor: SICFSensor, zones: FICFZone[]): string[] {
    // Abstract implementation:
    // If sensor is in zone A, and zone A is adjacent to zone B, and sensor is 'CONE',
    // it might see into B depending on properties.
    // For MWS, we assume a sensor sees its own zone, and if it has 'long_range' property, adjacent zones.

    const visibleZones = [sensor.zone_id];

    const zone = zones.find(z => z.zone_id === sensor.zone_id);
    if (!zone) return visibleZones;

    if (sensor.coverage_params?.range === 'LONG') {
        visibleZones.push(...zone.adjacency);
    }

    return visibleZones;
}

export function computeAcousticCoupling(zoneA: FICFZone, zoneB: FICFZone): boolean {
    // Abstract: Adjacent zones are acoustically coupled if policy_tags don't include 'SOUNDPROOF'
    if (!zoneA.adjacency.includes(zoneB.zone_id)) return false;

    const soundproofA = zoneA.policy_tags.includes('SOUNDPROOF');
    const soundproofB = zoneB.policy_tags.includes('SOUNDPROOF');

    return !soundproofA && !soundproofB;
}
