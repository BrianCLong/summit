import { MessageNode } from '../features/variant-graph';

const POLARIZATION_MARKERS = ['enemy', 'traitor', 'sheep', 'snowflake', 'fascist', 'communist', 'woke', 'maga', 'libtard', 'nazi'];
const US_VS_THEM_MARKERS = ['they want', 'their plan', 'our country', 'our people', 'their agenda'];

export function calculateCohesionFracture(messages: MessageNode[]): number {
  if (messages.length === 0) return 0;

  let fractureScore = 0;

  for (const msg of messages) {
    const lowerContent = msg.content.toLowerCase();

    for (const marker of POLARIZATION_MARKERS) {
      if (lowerContent.includes(marker)) {
        fractureScore += 1;
        break;
      }
    }
    for (const marker of US_VS_THEM_MARKERS) {
      if (lowerContent.includes(marker)) {
        fractureScore += 1;
        break;
      }
    }
  }

  // Ratio of polarizing messages
  const ratio = fractureScore / messages.length;

  // Cap at 1.0 (if 33% of messages are polarizing, that's max fracture for MWS)
  return Math.min(ratio * 3, 1.0);
}
