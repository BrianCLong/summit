export enum IdentifierType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  HANDLE = 'HANDLE',
  SSN = 'SSN',
  OTHER = 'OTHER',
}

export interface DeconflictionRequest {
  id: string
  requesterTenantId: string
  targetTenantId: string
  purpose: string
  tokens: string[]
  status: 'PENDING' | 'COMPLETED' | 'REJECTED'
  createdAt: string // Serialized Date
  result?: DeconflictionResponse
}

export interface DeconflictionResponse {
  overlapCount: number
  matchedTokens: string[]
  metadata: {
    entityCount: number
    summary: string
  }
  timestamp: string // Serialized Date
}
