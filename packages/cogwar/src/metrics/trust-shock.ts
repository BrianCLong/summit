import { MessageNode } from '../features/variant-graph';

const INSTITUTIONS = ['government', 'cdc', 'who', 'media', 'experts', 'science', 'police', 'court', 'election'];
const NEGATIVE_MARKERS = ['liar', 'fake', 'corrupt', 'coverup', 'scam', 'hoax', 'fraud', 'rigged', 'stolen'];

export function calculateTrustShock(messages: MessageNode[]): number {
  if (messages.length === 0) return 0;

  let shockCount = 0;

  for (const msg of messages) {
    const lowerContent = msg.content.toLowerCase();

    let mentionsInstitution = false;
    for (const inst of INSTITUTIONS) {
      if (lowerContent.includes(inst)) {
        mentionsInstitution = true;
        break;
      }
    }

    if (mentionsInstitution) {
      for (const marker of NEGATIVE_MARKERS) {
        if (lowerContent.includes(marker)) {
          shockCount++;
          break; // Count once per message
        }
      }
    }
  }

  // Ratio of messages attacking institutions
  const ratio = shockCount / messages.length;

  // Cap at 1.0 (if 50% of messages are attacks, that's max shock for MWS)
  return Math.min(ratio * 2, 1.0);
}
