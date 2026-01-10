import { AgentTrajectory } from '../schema.js';

export interface NegativeAugmentationOptions {
  seed?: string | number;
}

interface RandomSource {
  next(): number;
}

function createLCG(seed: string | number = Date.now()): RandomSource {
  let state =
    typeof seed === 'number'
      ? seed
      : Array.from(String(seed)).reduce(
          (acc, char) => acc + char.charCodeAt(0),
          0,
        );
  return {
    next: () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    },
  };
}

function cloneTrajectory(trajectory: AgentTrajectory): AgentTrajectory {
  return JSON.parse(JSON.stringify(trajectory)) as AgentTrajectory;
}

export function dropTool(
  allowlist: string[],
  options: NegativeAugmentationOptions = {},
): string[] {
  if (allowlist.length <= 1) return [...allowlist];
  const rng = createLCG(options.seed ?? 'dropTool');
  const index = Math.floor(rng.next() * allowlist.length);
  return allowlist.filter((_, i) => i !== index);
}

export function fuzzUser(
  content: string,
  options: NegativeAugmentationOptions = {},
): string {
  const rng = createLCG(options.seed ?? 'fuzzUser');
  const mutations = [
    (text: string) => `${text} pls?`,
    (text: string) => text.replace(/e/gi, '3'),
    (text: string) => `kinda ${text.toLowerCase()}`,
    (text: string) => `${text} but faster??`,
  ];
  const choice = mutations[Math.floor(rng.next() * mutations.length)];
  return choice(content);
}

export function perturbSteps(
  trajectory: AgentTrajectory,
  options: NegativeAugmentationOptions = {},
): AgentTrajectory {
  const rng = createLCG(options.seed ?? 'perturbSteps');
  const clone = cloneTrajectory(trajectory);
  if (clone.turns.length === 0) return clone;

  const shouldDelete = rng.next() > 0.5;
  if (shouldDelete && clone.turns.length > 1) {
    const removeIndex = Math.floor(rng.next() * clone.turns.length);
    clone.turns.splice(removeIndex, 1);
    return clone;
  }

  const duplicateIndex = Math.floor(rng.next() * clone.turns.length);
  const duplicated = JSON.parse(
    JSON.stringify(clone.turns[duplicateIndex]),
  ) as AgentTrajectory['turns'][number];
  clone.turns.splice(duplicateIndex, 0, duplicated);
  return clone;
}
