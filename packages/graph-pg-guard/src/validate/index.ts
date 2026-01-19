import { SimpleDriftReport } from '../domain/DriftReport';
import { checkFkRelExistence } from './checks/fk_to_rel';
import { Driver } from 'neo4j-driver';

export function buildReport() {
  return new SimpleDriftReport();
}

export async function runAllChecks(driver: Driver, report: SimpleDriftReport) {
  await checkFkRelExistence(driver, report);
}
