import { getReputation } from '../../server/src/reputation/ReputationService';

export function autoUnlist(publisher: string) {
  const rep = getReputation(publisher);
  if (rep.violations30d >= 3) {
    console.log(`Auto-unlisting ${publisher}`);
    return true;
  }
  return false;
}
