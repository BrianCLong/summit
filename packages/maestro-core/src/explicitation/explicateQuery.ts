import {
  ExplicitationArtifact,
  ExplicitationInput,
  ImageRef,
  ImageRefType,
  RetrievalPlanItem,
  UnknownSlot,
} from './types';

const DEICTIC_PATTERN = /\b(this|that|these|those|it|its|they|them)\b/gi;
const STOPWORD_ENTITIES = new Set([
  'How',
  'What',
  'Why',
  'When',
  'Where',
  'Which',
  'This',
  'That',
  'These',
  'Those',
  'There',
  'Here',
  'Please',
]);
const KNOWN_PLATFORMS = [
  'Windows',
  'macOS',
  'Linux',
  'Ubuntu',
  'Debian',
  'CentOS',
  'Android',
  'iOS',
];

const clamp = (value: number, min = 0, max = 1): number => {
  return Math.min(max, Math.max(min, value));
};

const normalizeText = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const imageTypeLabel = (type?: ImageRefType): string => {
  switch (type) {
    case 'screenshot':
      return 'screenshot';
    case 'photo':
      return 'photo';
    case 'diagram':
      return 'diagram';
    case 'map':
      return 'map';
    default:
      return 'image';
  }
};

const buildVisualEvidence = (imageRefs: ImageRef[]): string[] => {
  return imageRefs.map((ref) => {
    const parts = [`Provided ${imageTypeLabel(ref.type)}`];
    if (ref.altText) {
      parts.push(`shows: ${normalizeText(ref.altText)}`);
    }
    if (ref.detectedText) {
      parts.push(`detected text: ${normalizeText(ref.detectedText)}`);
    }
    return parts.join('; ');
  });
};

const extractEntities = (inputs: string[]): string[] => {
  const entities = new Set<string>();
  const combined = inputs.filter(Boolean).join(' ');

  const cveMatches = combined.match(/CVE-\d{4}-\d{4,7}/gi) ?? [];
  cveMatches.forEach((match) => entities.add(match.toUpperCase()));

  const errorMatches = combined.match(/(?:ERR|ERROR)[-_ ]?\d{2,6}/gi) ?? [];
  errorMatches.forEach((match) => entities.add(normalizeText(match.toUpperCase())));

  for (const platform of KNOWN_PLATFORMS) {
    if (combined.includes(platform)) {
      entities.add(platform);
    }
  }

  const capitalized = combined.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2}\b/g) ?? [];
  capitalized.forEach((match) => {
    if (!STOPWORD_ENTITIES.has(match)) {
      entities.add(match);
    }
  });

  return Array.from(entities);
};

const detectIntent = (text: string): string => {
  const lower = text.toLowerCase();
  if (/(fix|troubleshoot|resolve|error|issue|broken)/.test(lower)) {
    return 'troubleshoot';
  }
  if (/(what is|identify|name|recognize)/.test(lower)) {
    return 'identify';
  }
  if (/(how do i|how to|steps)/.test(lower)) {
    return 'instructions';
  }
  if (/(explain|interpret|analyze)/.test(lower)) {
    return 'explain';
  }
  return 'clarify';
};

const detectDomain = (text: string, imageRefs: ImageRef[]): string => {
  const lower = text.toLowerCase();
  if (imageRefs.some((ref) => ref.type === 'screenshot')) {
    return 'ui_troubleshooting';
  }
  if (imageRefs.some((ref) => ref.type === 'diagram')) {
    return 'diagram_analysis';
  }
  if (imageRefs.some((ref) => ref.type === 'map')) {
    return 'map_interpretation';
  }
  if (imageRefs.some((ref) => ref.type === 'photo')) {
    return 'object_identification';
  }
  if (/(diagram|architecture|flow)/.test(lower)) {
    return 'diagram_analysis';
  }
  return 'general';
};

const replaceDeictics = (text: string, subject: string): string => {
  const typedPattern =
    /\b(this|that|these|those)\s+(diagram|map|photo|screenshot|image)\b/gi;
  const genericPattern = /\b(this|that|these|those)\s+(thing|object|item)\b/gi;
  const locationPattern = /\b(here|there)\b/gi;
  const typedReplaced = text.replace(
    typedPattern,
    (_match, _deictic, noun) => `the ${noun} content`,
  );
  const genericReplaced = typedReplaced.replace(
    genericPattern,
    () => subject,
  );
  const locationReplaced = genericReplaced.replace(
    locationPattern,
    () => `in ${subject}`,
  );
  return locationReplaced.replace(DEICTIC_PATTERN, subject);
};

const buildExplicitQuery = (
  text: string,
  imageRefs: ImageRef[],
  conversationSummary?: string,
): string => {
  const subject = imageRefs.length
    ? `the ${imageTypeLabel(imageRefs[0].type)} content`
    : conversationSummary
      ? 'the issue described in the session context'
      : 'the referenced item';
  const replaced = replaceDeictics(text, subject);
  const normalized = normalizeText(replaced);
  const visuals = buildVisualEvidence(imageRefs);
  const detailSuffix = visuals.length
    ? ` Visual evidence: ${visuals.join(' | ')}.`
    : '';
  const contextSuffix = conversationSummary
    ? ` Context: ${normalizeText(conversationSummary)}.`
    : '';
  const terminal = /[.!?]$/.test(normalized) ? '' : '.';
  return `${normalized}${terminal}${detailSuffix}${contextSuffix}`.trim();
};

const buildUnknownSlots = (
  intent: string,
  domain: string,
  entities: string[],
  imageRefs: ImageRef[],
): UnknownSlot[] => {
  const slots: UnknownSlot[] = [];
  const hasErrorCode = entities.some((entity) =>
    /(CVE-|ERR|ERROR)/.test(entity),
  );
  const hasAppEntity = entities.length > 0;
  const isScreenshot = imageRefs.some((ref) => ref.type === 'screenshot');

  if (intent === 'troubleshoot') {
    if (!hasAppEntity) {
      slots.push({
        slot: 'app_or_system',
        why_it_matters: 'Needed to match troubleshooting guidance to the correct product.',
        ask_user_if_low_confidence: true,
      });
    }
    if (!hasErrorCode) {
      slots.push({
        slot: 'error_message_or_code',
        why_it_matters: 'Exact error text enables precise remediation steps.',
        ask_user_if_low_confidence: true,
      });
    }
  }

  if (intent === 'identify' && !hasAppEntity) {
    slots.push({
      slot: 'object_context',
      why_it_matters: 'Context narrows identification to the right domain.',
      ask_user_if_low_confidence: true,
    });
  }

  if (domain === 'diagram_analysis') {
    slots.push({
      slot: 'diagram_type',
      why_it_matters: 'Determines how to interpret nodes, edges, and annotations.',
      ask_user_if_low_confidence: false,
    });
  }

  if (domain === 'map_interpretation') {
    slots.push({
      slot: 'risk_context',
      why_it_matters: 'Safety depends on time, route, and threat conditions.',
      ask_user_if_low_confidence: true,
    });
  }

  if (isScreenshot && intent === 'clarify') {
    slots.push({
      slot: 'goal',
      why_it_matters: 'Clarifies what outcome the user expects from the UI.',
      ask_user_if_low_confidence: true,
    });
  }

  return slots;
};

const buildRetrievalPlan = (
  explicitQuery: string,
  entities: string[],
  domain: string,
): RetrievalPlanItem[] => {
  const plan: RetrievalPlanItem[] = [];
  const entitySummary = entities.length ? entities.join(', ') : 'key terms';

  plan.push({
    source: 'kb',
    query: `Look up internal guidance for: ${explicitQuery}`,
  });

  if (domain !== 'general') {
    plan.push({
      source: 'files',
      query: `Search project files for related context: ${explicitQuery}`,
    });
  }

  if (entities.some((entity) => entity.startsWith('CVE-'))) {
    plan.push({
      source: 'graph',
      query: `Resolve graph entities for ${entitySummary} and related incidents`,
    });
  }

  const properNouns = entities.filter((entity) => /[A-Z]/.test(entity));
  if (properNouns.length > 0) {
    plan.push({
      source: 'web',
      query: `Verify proper nouns (${properNouns.join(', ')}) and authoritative references`,
    });
  }

  return plan;
};

const pickAnswerStyle = (intent: string, domain: string): 'checklist' | 'steps' | 'explanation' => {
  if (intent === 'troubleshoot' || intent === 'instructions') {
    return 'steps';
  }
  if (domain === 'diagram_analysis') {
    return 'checklist';
  }
  return 'explanation';
};

const pickClarifyingQuestion = (slot: string): string => {
  switch (slot) {
    case 'app_or_system':
      return 'Which application or system is shown in the screenshot?';
    case 'error_message_or_code':
      return 'What is the exact error message or code shown?';
    case 'object_context':
      return 'Where was the object found or used?';
    case 'diagram_type':
      return 'What does the diagram represent (network, architecture, map, etc.)?';
    case 'risk_context':
      return 'What timeframe, route, and threat context should be considered?';
    case 'goal':
      return 'What outcome are you trying to achieve?';
    default:
      return 'What additional details can you share to clarify the request?';
  }
};

const calculateConfidence = (
  intent: string,
  imageRefs: ImageRef[],
  entities: string[],
  unknownSlots: UnknownSlot[],
): number => {
  let score = 0.35;
  if (intent !== 'clarify') {
    score += 0.2;
  }
  if (imageRefs.length > 0) {
    score += 0.15;
  }
  if (imageRefs.some((ref) => ref.detectedText)) {
    score += 0.1;
  }
  if (entities.length > 0) {
    score += 0.1;
  }
  score -= Math.min(0.3, unknownSlots.length * 0.05);
  return clamp(score, 0.1, 0.95);
};

export const explicateQuery = (input: ExplicitationInput): ExplicitationArtifact => {
  const userText = normalizeText(input.userText);
  const imageRefs = input.imageRefs ?? [];
  const conversationSummary = input.conversationContext?.summary;
  const priorEntities = input.conversationContext?.priorEntities ?? [];
  const intent = detectIntent(userText);
  const domain = detectDomain(userText, imageRefs);
  const entities = extractEntities([
    userText,
    conversationSummary ?? '',
    ...(imageRefs.map((ref) => ref.detectedText ?? '')),
    ...priorEntities,
  ]);
  const explicitQuery = buildExplicitQuery(userText, imageRefs, conversationSummary);
  const unknownSlots = buildUnknownSlots(intent, domain, entities, imageRefs);
  const confidence = calculateConfidence(intent, imageRefs, entities, unknownSlots);

  const clarifyingQuestion =
    confidence < 0.6 && unknownSlots.length > 0
      ? pickClarifyingQuestion(unknownSlots[0].slot)
      : undefined;

  return {
    explicit_query: explicitQuery,
    intent,
    domain_guess: domain,
    entities,
    visual_evidence: buildVisualEvidence(imageRefs),
    assumptions: imageRefs.length ? ['Visual evidence reflects the user-provided images.'] : [],
    unknown_slots: unknownSlots,
    retrieval_plan: buildRetrievalPlan(explicitQuery, entities, domain),
    answer_style: pickAnswerStyle(intent, domain),
    confidence,
    clarifying_question: clarifyingQuestion,
  };
};

export const isExplicitationArtifact = (value: unknown): value is ExplicitationArtifact => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as ExplicitationArtifact;
  return (
    typeof candidate.explicit_query === 'string' &&
    typeof candidate.intent === 'string' &&
    typeof candidate.domain_guess === 'string' &&
    Array.isArray(candidate.entities) &&
    Array.isArray(candidate.visual_evidence) &&
    Array.isArray(candidate.assumptions) &&
    Array.isArray(candidate.unknown_slots) &&
    Array.isArray(candidate.retrieval_plan) &&
    typeof candidate.answer_style === 'string' &&
    typeof candidate.confidence === 'number'
  );
};
