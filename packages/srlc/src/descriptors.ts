import { DataFormat, FieldRule, TransformAction } from './types.js';

function describeMask(action: Extract<TransformAction, { type: 'mask' }>, format: DataFormat): string {
  return `mask(format=${format},keep=${action.keep},char=${action.char})`;
}

function describeHash(action: Extract<TransformAction, { type: 'hash' }>, format: DataFormat): string {
  return `hash(format=${format},algorithm=${action.algorithm},salt=${action.saltScope})`;
}

function describeTokenize(action: Extract<TransformAction, { type: 'tokenize' }>, format: DataFormat): string {
  return `tokenize(format=${format},namespace=${action.namespace},preserveFormat=${action.preserveFormat})`;
}

function describeGeneralize(action: Extract<TransformAction, { type: 'generalize' }>, format: DataFormat): string {
  return `generalize(format=${format},granularity=${action.granularity})`;
}

export function describeAction(action: TransformAction, format: DataFormat): string {
  switch (action.type) {
    case 'mask':
      return describeMask(action, format);
    case 'hash':
      return describeHash(action, format);
    case 'tokenize':
      return describeTokenize(action, format);
    case 'generalize':
      return describeGeneralize(action, format);
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function canonicalPipeline(field: FieldRule): string[] {
  return field.transforms.map((action) => describeAction(action, field.format));
}

export function canonicalTransformSignature(field: FieldRule): string {
  return `${field.path}:${canonicalPipeline(field).join(' |> ')}`;
}
