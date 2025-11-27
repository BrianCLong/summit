import { PiiCategory } from '../types';
import { tagPiiField, getPiiClassification } from '../utils';

describe('PII Utils', () => {
  it('should create a PII tag for a field', () => {
    const piiTag = tagPiiField('email', PiiCategory.Sensitive, 0.9);
    expect(piiTag).toEqual({
      email: {
        category: PiiCategory.Sensitive,
        confidence: 0.9,
      },
    });
  });

  it('should retrieve the PII classification for a field', () => {
    const piiTags = [
      tagPiiField('email', PiiCategory.Sensitive, 0.9),
      tagPiiField('name', PiiCategory.Low),
    ];
    const classification = getPiiClassification(piiTags, 'email');
    expect(classification).toEqual({
      category: PiiCategory.Sensitive,
      confidence: 0.9,
    });
  });

  it('should return undefined for a field that is not tagged', () => {
    const piiTags = [tagPiiField('name', PiiCategory.Low)];
    const classification = getPiiClassification(piiTags, 'email');
    expect(classification).toBeUndefined();
  });
});
