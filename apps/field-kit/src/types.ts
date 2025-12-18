export type SensitivityLevel = 'GREEN' | 'AMBER' | 'RED';
export type LicenseType = 'USGOV' | 'OSINT' | 'COMMERCIAL';

export interface FieldEntity {
  id: string;
  type: string;
  label: string;
}

export interface FieldNote {
  id: string;
  caseId: string;
  content: string;
  timestamp: string; // ISO string
  location?: {
    lat: number;
    lng: number;
  };
  attachments: string[]; // IDs of FieldMediaCapture
  tags: string[]; // IDs of FieldEntity
  sensitivity: SensitivityLevel;
  license: LicenseType;
  syncStatus: 'pending' | 'synced' | 'error';
  syncError?: string;
}

export interface FieldMediaCapture {
  id: string;
  caseId: string;
  type: 'photo' | 'video' | 'audio';
  blob: Blob; // Stored locally
  mimeType: string;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
  };
  tags: string[]; // IDs of FieldEntity
  sensitivity: SensitivityLevel;
  license: LicenseType;
  metadata: Record<string, any>;
  syncStatus: 'pending' | 'synced' | 'error';
  remoteId?: string; // ID after sync
}

export interface FieldCaseSnapshot {
  id: string; // Case ID
  title: string;
  description: string;
  status: string;
  entities: FieldEntity[];
  lastSynced: string;
  notes: string[]; // IDs of FieldNote
  media: string[]; // IDs of FieldMediaCapture
}

export interface SyncQueueItem {
  id: string;
  type: 'note' | 'media';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
  retries: number;
}
