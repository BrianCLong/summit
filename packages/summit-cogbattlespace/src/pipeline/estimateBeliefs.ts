import type { Artifact, Belief } from '../types';

const SUPPORT_MARKERS = [/true/i, /confirmed/i, /proven/i, /evidence/i];
const OPPOSE_MARKERS = [/false/i, /hoax/i, /debunk/i, /disputed/i];

function polarityFromText(text: string): 'support' | 'oppose' | 'uncertain' {
  if (OPPOSE_MARKERS.some((pattern) => pattern.test(text))) {
    return 'oppose';
  }
  if (SUPPORT_MARKERS.some((pattern) => pattern.test(text))) {
    return 'support';
  }
  return 'uncertain';
}

function confidenceFromPolarity(
  polarity: 'support' | 'oppose' | 'uncertain',
  text: string,
): number {
  const certaintyMarkers = /definitely|certainly|undeniable|clearly/i.test(text);
  if (polarity === 'uncertain') {
    return 0.5;
  }
  return certaintyMarkers ? 0.8 : 0.65;
}

export async function estimateBeliefs(artifacts: Artifact[]): Promise<Belief[]> {
  return artifacts.map((artifact) => {
    const proposition = artifact.content.text.split(/[.!?]/)[0]?.trim() ?? artifact.content.text;
    const polarity = polarityFromText(artifact.content.text);
    const confidence = confidenceFromPolarity(polarity, artifact.content.text);

    return {
      id: `belief_${artifact.id}`,
      proposition,
      polarity,
      confidence,
      timeSeries: [
        {
          t: artifact.observedAt,
          cohortId: `cohort_${artifact.source.platform.toLowerCase()}`,
          prevalence: confidence,
          uncertainty: 1 - confidence,
        },
      ],
      provenance: {
        evidenceArtifacts: [artifact.id],
        estimator: 'rule-estimator-v1',
      },
    };
  });
}
