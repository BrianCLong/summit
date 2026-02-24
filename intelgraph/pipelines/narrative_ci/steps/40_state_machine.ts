import fs from 'fs';

interface NarrativeState {
  narrative_id: string;
  state: 'emerging' | 'hardened' | 'institutionalized';
  score: number;
}

interface TransitionEvent {
  narrative_id: string;
  from_state: string;
  to_state: string;
  trigger_scores: any;
  supporting_artifacts: string[];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: tsx 40_state_machine.ts <prev_states_path> <current_scores_path> <output_path>');
    process.exit(1);
  }

  const [prevStatesPath, currentScoresPath, outputPath] = args;

  // Load previous states
  let prevStates: NarrativeState[] = [];
  if (fs.existsSync(prevStatesPath)) {
    prevStates = JSON.parse(fs.readFileSync(prevStatesPath, 'utf-8'));
  }
  const prevMap = new Map(prevStates.map(s => [s.narrative_id, s]));

  // Load current scores (e.g., calculated from artifacts/claims volume + handoffs)
  // Assuming input is a list of narratives with current scores
  const currentNarratives: NarrativeState[] = JSON.parse(fs.readFileSync(currentScoresPath, 'utf-8'));

  const transitions: TransitionEvent[] = [];
  const newStates: NarrativeState[] = [];

  for (const curr of currentNarratives) {
    const prev = prevMap.get(curr.narrative_id);
    let newState = curr.state;

    // Logic for transitions based on score thresholds
    // Example: If score > 0.8 and was 'emerging', move to 'hardened'
    if (curr.score > 0.8 && (!prev || prev.state === 'emerging')) {
      newState = 'hardened';
      transitions.push({
        narrative_id: curr.narrative_id,
        from_state: prev ? prev.state : 'emerging',
        to_state: 'hardened',
        trigger_scores: { score: curr.score },
        supporting_artifacts: [] // Fill with relevant artifacts
      });
    } else if (curr.score > 1.5 && (!prev || prev.state === 'hardened')) { // arbitrary threshold
        newState = 'institutionalized';
        transitions.push({
            narrative_id: curr.narrative_id,
            from_state: prev ? prev.state : 'hardened',
            to_state: 'institutionalized',
            trigger_scores: { score: curr.score },
            supporting_artifacts: []
        });
    }

    newStates.push({ ...curr, state: newState });
  }

  // Persist new states and transitions
  const output = {
    states: newStates,
    transitions: transitions
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`State machine output written to ${outputPath}`);
}

main().catch(console.error);
