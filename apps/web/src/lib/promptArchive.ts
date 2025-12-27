export const CONTEXT_SKILLS = [
  'context-fundamentals',
  'context-degradation',
  'context-compression',
  'multi-agent-patterns',
  'memory-systems',
  'tool-design',
  'context-optimization',
  'evaluation',
  'advanced-evaluation',
  'project-development',
] as const;

export type ContextSkill = (typeof CONTEXT_SKILLS)[number];

export type PromptArchiveEntry = {
  id: string;
  prompt: string;
  summary: string;
  createdAt: string;
  tags: string[];
  improvements: string;
  tuningNotes: string;
  contextSkills: ContextSkill[];
};

const STORAGE_KEY = 'maestro.promptArchive.v1';
const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type PromptArchiveStore = {
  entries: PromptArchiveEntry[];
};

const getStore = (): PromptArchiveStore => {
  if (typeof window === 'undefined') {
    return { entries: [] };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { entries: [] };
  try {
    const parsed = JSON.parse(raw) as PromptArchiveStore;
    if (!parsed.entries) return { entries: [] };
    return parsed;
  } catch {
    return { entries: [] };
  }
};

const saveStore = (store: PromptArchiveStore) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const archivePrompt = (input: {
  prompt: string;
  summary?: string;
  tags?: string[];
  improvements?: string;
  tuningNotes?: string;
  contextSkills?: ContextSkill[];
}): PromptArchiveEntry => {
  const store = getStore();
  const entry: PromptArchiveEntry = {
    id: createId(),
    prompt: input.prompt,
    summary:
      (input.summary ?? input.prompt.slice(0, 140).trim()) ||
      'Untitled prompt',
    createdAt: new Date().toISOString(),
    tags: input.tags ?? [],
    improvements: input.improvements ?? '',
    tuningNotes: input.tuningNotes ?? '',
    contextSkills: input.contextSkills ?? [],
  };

  store.entries.unshift(entry);
  saveStore(store);
  return entry;
};

export const listPromptArchive = (limit = 10): PromptArchiveEntry[] => {
  const store = getStore();
  return store.entries.slice(0, limit);
};

export const searchPromptArchive = (options: {
  query?: string;
  tags?: string[];
  contextSkills?: ContextSkill[];
}): PromptArchiveEntry[] => {
  const { query, tags = [], contextSkills = [] } = options;
  const store = getStore();
  return store.entries.filter(entry => {
    const matchesQuery = query
      ? `${entry.prompt} ${entry.summary}`
          .toLowerCase()
          .includes(query.toLowerCase())
      : true;
    const matchesTags = tags.length
      ? tags.every(tag => entry.tags.includes(tag))
      : true;
    const matchesSkills = contextSkills.length
      ? contextSkills.every(skill => entry.contextSkills.includes(skill))
      : true;
    return matchesQuery && matchesTags && matchesSkills;
  });
};

export const clearPromptArchive = () => {
  saveStore({ entries: [] });
};
