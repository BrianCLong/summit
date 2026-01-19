import { Driver } from 'neo4j-driver';
import { DriftReport } from '../domain/DriftReport.js';
import { checkFkRelExistence } from './checks/fk_to_rel.js';

export async function runAllChecks(driver: Driver): Promise<DriftReport> {
  const report = new DriftReport();
  await checkFkRelExistence(driver, report);
  return report;
}
