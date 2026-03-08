import * as fs from 'fs';

export type PromptClass = "discovery" | "shortlist" | "comparison" | "decision" | "implementation" | "recommendation" | "alternatives" | "how-to";

export interface PromptSpec {
  id: string;
  cls: PromptClass;
  text: string;
  weight: number;
  fanoutOf?: string;
}

export interface PromptTaxonomy {
    intents: {id: string, weight: number, examples: string[]}[];
    categories: {id: string, weight: number}[];
    modifiers: {id: string, weight: number}[];
    contexts: {id: string, weight: number}[];
}

// Simple yaml parser just for our internal taxonomy format to avoid dependencies
export function parseTaxonomyYaml(yamlStr: string): PromptTaxonomy {
    const result: any = { intents: [], categories: [], modifiers: [], contexts: [] };
    let currentSection = '';

    const lines = yamlStr.split('\n');
    let currentItem: any = null;

    for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('#')) continue;

        const indent = line.search(/\S/);
        const text = line.trim();

        if (indent === 0 && text.endsWith(':')) {
            if (currentItem && currentSection) {
                result[currentSection].push(currentItem);
                currentItem = null;
            }
            currentSection = text.slice(0, -1);
            continue;
        }

        if (text.startsWith('- ')) {
            if (currentItem && currentSection) {
                result[currentSection].push(currentItem);
            }
            currentItem = {};
            const parts = text.slice(2).split(': ');
            if (parts.length > 1) {
                const key = parts[0];
                const value = parts.slice(1).join(': ').replace(/^"|"$/g, '');
                currentItem[key] = key === 'weight' ? parseFloat(value) : value;
            }
        } else if (text.includes(': ') && currentItem) {
            const parts = text.split(': ');
            const key = parts[0];
            const value = parts.slice(1).join(': ');

            if (key === 'examples') {
                const arrMatch = value.match(/\[(.*)\]/);
                if (arrMatch) {
                    currentItem[key] = arrMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                }
            } else {
                currentItem[key] = key === 'weight' ? parseFloat(value) : value.replace(/^"|"$/g, '');
            }
        }
    }

    if (currentItem && currentSection) {
        result[currentSection].push(currentItem);
    }

    return result as PromptTaxonomy;
}

export class PromptSampler {
    private taxonomy: PromptTaxonomy;

    constructor(taxonomyPath: string) {
        const file = fs.readFileSync(taxonomyPath, 'utf8');
        this.taxonomy = parseTaxonomyYaml(file);
    }

    public generateDeterministicPrompts(): PromptSpec[] {
        const prompts: PromptSpec[] = [];
        let idCounter = 1;

        for (const intent of this.taxonomy.intents) {
            if (intent.id === "recommendation" || intent.id === "comparison" || intent.id === "alternatives" || intent.id === "how-to") {
                for (const category of this.taxonomy.categories) {
                    for (const modifier of this.taxonomy.modifiers) {
                        for (const context of this.taxonomy.contexts) {
                            const text = `best ${category.id} for ${modifier.id} for ${context.id}`; // Simplified template application for deterministic output in v1
                            const weight = intent.weight * category.weight * modifier.weight * context.weight;

                            prompts.push({
                                id: `GEO:PROMPT:${idCounter.toString().padStart(3, '0')}`,
                                cls: intent.id as PromptClass,
                                text,
                                weight
                            });
                            idCounter++;
                        }
                    }
                }
            }
        }
        return prompts;
    }
}
