export enum EntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  DATE = 'DATE',
  UNKNOWN = 'UNKNOWN'
}

export interface Entity {
  id?: string;
  type: EntityType;
  text: string;
  attributes: Record<string, any>;
  confidence: number;
  start?: number;
  end?: number;
}

export interface ExtractionResult {
  text: string;
  entities: Entity[];
  metadata: {
    model: string;
    extractionTime: number;
  };
}
