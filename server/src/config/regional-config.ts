export interface RegionalInfo {
    region: string;
    baseUrl: string;
    isPublic: boolean;
}

export const REGIONAL_CONFIG: Record<string, RegionalInfo> = {
    'us-east-1': {
        region: 'us-east-1',
        baseUrl: process.env.REGION_URL_US_EAST_1 || 'https://us-east.intelgraph.com',
        isPublic: true,
    },
    'us-west-2': {
        region: 'us-west-2',
        baseUrl: process.env.REGION_URL_US_WEST_2 || 'https://us-west.intelgraph.com',
        isPublic: true,
    },
    'eu-central-1': {
        region: 'eu-central-1',
        baseUrl: process.env.REGION_URL_EU_CENTRAL_1 || 'https://eu-central.intelgraph.com',
        isPublic: true,
    },
    'eu-west-1': {
        region: 'eu-west-1',
        baseUrl: process.env.REGION_URL_EU_WEST_1 || 'https://eu-west.intelgraph.com',
        isPublic: true,
    },
};

export const getRegionUrl = (region: string): string | undefined => {
    return REGIONAL_CONFIG[region]?.baseUrl;
};

export const getCurrentRegion = (): string => {
    return process.env.SUMMIT_REGION || process.env.REGION || 'us-east-1';
};
