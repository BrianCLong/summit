import { writeSummary } from "../lib/artifacts";
import { getRunMeta } from "../lib/context";

export async function triageAgent(): Promise<void> {
  writeSummary(`triageAgent run\n${JSON.stringify(getRunMeta(), null, 2)}`);
}
