import { SweRebenchInstance } from '../../datasets/swe-rebench/types';

export async function runTask(instance: SweRebenchInstance) {
  // Execute tests before/after patch and compute metrics
  console.log(`Running task for instance ${instance.instance_id}`);
}
