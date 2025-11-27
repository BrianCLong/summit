import { PiiCategory, PiiClassification, PiiTaggedField } from './types';

export function tagPiiField(
  fieldName: string,
  category: PiiCategory,
  confidence?: number
): PiiTaggedField {
  const classification: PiiClassification = { category };
  if (confidence) {
    classification.confidence = confidence;
  }
  return { [fieldName]: classification };
}

export function getPiiClassification(
  taggedFields: PiiTaggedField[],
  fieldName: string
): PiiClassification | undefined {
  for (const taggedField of taggedFields) {
    if (taggedField[fieldName]) {
      return taggedField[fieldName];
    }
  }
  return undefined;
}
