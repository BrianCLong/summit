import { EdgeType, NodeType } from '../mesh/schema';

export interface ExfilPattern {
    id: string;
    name: string;
    description: string;
    required_edges: EdgeType[];
    required_nodes: NodeType[];
    condition: (path: any[]) => boolean;
}

export const VISUAL_EXFIL_PATTERN: ExfilPattern = {
    id: 'VIS-001',
    name: 'Visual Capture Risk',
    description: 'Path exists where a visual sensor has line of sight to a sensitive zone.',
    required_edges: ['LINE_OF_SIGHT'],
    required_nodes: ['SENSOR', 'ZONE'],
    condition: (path) => true
};

export const ACOUSTIC_EXFIL_PATTERN: ExfilPattern = {
    id: 'AUD-001',
    name: 'Acoustic Leakage Risk',
    description: 'Path exists where an audio sensor is in an acoustically coupled zone.',
    required_edges: ['ACOUSTIC_COUPLING'],
    required_nodes: ['SENSOR', 'ZONE'],
    condition: (path) => true
};
