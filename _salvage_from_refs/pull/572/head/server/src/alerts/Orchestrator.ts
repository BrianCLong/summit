import { groupAlerts } from './AutoGrouping';
import { caseResolvers } from '../graphql/resolvers/cases';

export function orchestrate(alerts: any[]) {
  const groups = groupAlerts(alerts);
  return groups.map(g => caseResolvers.Mutation.createCase({}, { title: `Case ${g[0].id}` }));
}
