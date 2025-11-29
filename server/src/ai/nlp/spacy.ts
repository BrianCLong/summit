export type Lang = 'en' | 'es' | 'fr' | 'de';

export interface Entity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence?: number;
}

export type Entities = Entity[];

type SpacyModel = {
  pipe: (text: string) => Promise<Entities> | Entities;
};

const modelCache = new Map<Lang, Promise<SpacyModel>>();

async function loadModel(lang: Lang): Promise<SpacyModel> {
  const cached = modelCache.get(lang);
  if (cached) {
    return cached;
  }

  const modelPromise = Promise.resolve<SpacyModel>({
    pipe: async (text: string) => basicEntityHeuristics(text),
  });

  modelCache.set(lang, modelPromise);
  return modelPromise;
}

function basicEntityHeuristics(text: string): Entities {
  const entities: Entities = [];
  const entityPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = entityPattern.exec(text)) !== null) {
    const [matchedText] = match;
    const start = match.index;
    const end = start + matchedText.length;
    entities.push({
      text: matchedText,
      label: 'ENTITY',
      start,
      end,
      confidence: 0.5,
    });
  }
  return entities;
}

export async function extractEntities(text: string, lang: Lang): Promise<Entities> {
  const nlp = await loadModel(lang);
  const result = await nlp.pipe(text);
  return result;
}
