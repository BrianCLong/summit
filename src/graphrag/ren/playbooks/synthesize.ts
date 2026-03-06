import { DEGF, RecommendedMove } from '../ecf';
import { PLAYBOOK_TEMPLATES } from './catalog';

export class PlaybookSynthesizer {
  public synthesize(degResult: DEGF): any {
    const playbooks: any[] = [];

    // Map recommended moves to playbooks
    for (const move of degResult.recommended_moves) {
      if (move.move_type === 'redaction_request') {
        playbooks.push({
          ...PLAYBOOK_TEMPLATES['supply_chain_redaction'],
          context: move.rationale
        });
      }
    }

    return playbooks;
  }
}
