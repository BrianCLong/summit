import { writeSummary } from "../lib/artifacts";
import { getRunMeta } from "../lib/context";

export async function readinessAgent(): Promise<void> {
  writeSummary(`readinessAgent run\n${JSON.stringify(getRunMeta(), null, 2)}`);
}
