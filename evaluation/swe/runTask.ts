import { SweRebenchInstance } from "../../datasets/swe-rebench/types";

export function runTask(instance: SweRebenchInstance) {
  // Execute tests before/after patch and compute metrics
  // eslint-disable-next-line no-console
  console.log(`Running task for instance ${instance.instance_id}`);
}
