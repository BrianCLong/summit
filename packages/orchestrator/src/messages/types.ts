export interface MessageEnvelope {
  message_id: string;
  team_id: string;
  from_agent_id: string;
  to: string; // agent_id or 'broadcast'
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  signature?: string;
  nonce?: string;
}
