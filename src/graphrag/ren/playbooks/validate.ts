import { RecommendedMove } from '../ecf';

export class LegalEnvelopeValidator {
  public validate(moves: RecommendedMove[]): boolean {
    for (const move of moves) {
      if (this.isEvasion(move)) {
        throw new Error(`Move ${move.move_id} violates legal envelope: ${move.rationale}`);
      }
    }
    return true;
  }

  private isEvasion(move: RecommendedMove): boolean {
    const forbiddenTerms = ['hide', 'destroy', 'falsify', 'evade', 'ignore'];
    return forbiddenTerms.some(term => move.rationale.toLowerCase().includes(term));
  }
}
