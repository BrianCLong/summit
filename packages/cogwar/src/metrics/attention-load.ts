import { MessageNode } from '../features/variant-graph';

const URGENCY_KEYWORDS = ['urgent', 'breaking', 'alert', 'panic', 'crisis', 'now', 'danger', 'warning'];

export function calculateAttentionLoad(messages: MessageNode[], windowMs: number): number {
  if (messages.length === 0) return 0;

  const startTime = messages[0].timestamp;
  const endTime = messages[messages.length - 1].timestamp;
  const duration = Math.max(endTime - startTime, 1000); // Avoid div by zero

  let urgencyScore = 0;
  for (const msg of messages) {
    const lowerContent = msg.content.toLowerCase();
    for (const keyword of URGENCY_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        urgencyScore += 1;
      }
    }
    // Uppercase boosts urgency (simple heuristic)
    if (msg.content === msg.content.toUpperCase() && msg.content.length > 5) {
      urgencyScore += 0.5;
    }
  }

  // Normalize: score per minute
  const load = (urgencyScore / (duration / 60000));

  // Cap at 1.0 for a "saturation" threshold of e.g., 10 urgent markers per minute
  return Math.min(load / 10, 1.0);
}
