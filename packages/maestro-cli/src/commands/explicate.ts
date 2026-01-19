import { explicateQuery } from '@maestro/core/explicitation';

interface ExplicateOptions {
  text: string;
  image?: string[];
  context?: string;
}

const parseJson = <T>(value: string, label: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${(error as Error).message}`);
  }
};

export class ExplicateCommand {
  async execute(options: ExplicateOptions): Promise<void> {
    const imageRefs = (options.image ?? []).map((raw) =>
      parseJson<Record<string, unknown>>(raw, 'image'),
    );
    const conversationContext = options.context
      ? parseJson<Record<string, unknown>>(options.context, 'context')
      : undefined;

    const artifact = explicateQuery({
      userText: options.text,
      imageRefs: imageRefs.map((ref, index) => ({
        id: String(ref.id ?? `image-${index + 1}`),
        type: ref.type as 'screenshot' | 'photo' | 'diagram' | 'map' | 'unknown',
        altText: ref.altText as string | undefined,
        detectedText: ref.detectedText as string | undefined,
      })),
      conversationContext: conversationContext
        ? {
            summary: conversationContext.summary as string | undefined,
            project: conversationContext.project as string | undefined,
            priorEntities: Array.isArray(conversationContext.priorEntities)
              ? conversationContext.priorEntities.map(String)
              : undefined,
          }
        : undefined,
    });

    process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
  }
}
