export interface SwarmNode {
  id: string;
  role: 'leader' | 'worker' | 'observer';
  capabilities: string[];
  status: 'active' | 'busy' | 'offline';
  lastSeen: number;
}

export type MessageType = 'heartbeat' | 'proposal' | 'vote' | 'decision' | 'task_assignment';

export interface SwarmMessage {
  id: string;
  type: MessageType;
  senderId: string;
  timestamp: number;
  payload: any;
  signature?: string;
}

export interface Proposal {
  id: string;
  proposerId: string;
  action: string;
  params: any;
  timestamp: number;
  votes: Record<string, boolean>; // Changed from Map to Record for JSON serialization
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ConsensusState {
  term: number;
  leaderId: string | null;
  proposals: Record<string, Proposal>; // Changed from Map to Record
}
