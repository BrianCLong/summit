import { normalizeTrigger } from '../../agentic/ai-stack/trigger-bus.js';
import { orchestrate } from '../../agentic/ai-stack/orchestrator.js';

export async function handleWebhook(req: any, res: any) {
  try {
    const event = normalizeTrigger(req.body);
    const result = await orchestrate(event);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
