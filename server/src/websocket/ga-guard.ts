/**
 * GA WebSocket Guard - Controls message flow based on safety criteria
 */

interface CounterMessage {
  type: string;
  pii?: boolean;
  mode?: string;
  human_approved?: boolean;
}

interface GateResult {
  allowed: boolean;
  action?: 'BLOCK' | 'HOLD' | 'ALLOW';
  reason?: string;
}

const UNSAFE_MODES = ['attack_mode', 'offensive', 'destructive'];
const SAFE_MODES = ['prebunk', 'cred_bridge', 'inform', 'defensive'];

export function checkCounterGate(msg: CounterMessage): GateResult {
  // Block PII
  if (msg.pii) {
    return {
      allowed: false,
      action: 'BLOCK',
      reason: 'Message contains PII - blocked',
    };
  }

  // Block unsafe modes
  if (msg.mode && UNSAFE_MODES.includes(msg.mode)) {
    return {
      allowed: false,
      action: 'BLOCK',
      reason: `Message uses unsafe mode: ${msg.mode}`,
    };
  }

  // Hold messages needing human approval
  if (!msg.human_approved) {
    return {
      allowed: false,
      action: 'HOLD',
      reason: 'Message needs human approval before proceeding',
    };
  }

  // Allow safe modes with approval
  if (msg.mode && SAFE_MODES.includes(msg.mode)) {
    return {
      allowed: true,
      action: 'ALLOW',
    };
  }

  // Default allow for approved messages without specific mode
  return {
    allowed: true,
    action: 'ALLOW',
  };
}
