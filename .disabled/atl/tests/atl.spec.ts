import { trainATL, inferTariff } from '../src';
import { randomUUID } from 'crypto';

describe('ATL', () => {
  test('should train and infer tariffs', () => {
    const historicalData = [
      {
        fp: {
          contentHash: randomUUID(),
          formatSig: 'mime:1000:0:NOEXIF',
          timingSig: '12h:0',
          xformSig: 'nokpw',
          route: 'tip',
        },
        outcome: { accepted: 1, disputed: 0, retracted: 0, beliefDecay: 0.1 },
      },
      {
        fp: {
          contentHash: randomUUID(),
          formatSig: 'mime:500:0:EXIF',
          timingSig: '02h:1',
          xformSig: 'kpw',
          route: 'social',
        },
        outcome: { accepted: 0, disputed: 1, retracted: 0, beliefDecay: 0.5 },
      },
    ];
    const model = trainATL(historicalData);
    const testFp = {
      contentHash: randomUUID(),
      formatSig: 'mime:2000:1:NOEXIF',
      timingSig: '23h:0',
      xformSig: 'nokpw',
      route: 'email',
    };
    const tariff = inferTariff(model, testFp);

    expect(tariff).toHaveProperty('minProofLevel');
    expect(tariff).toHaveProperty('rateLimit');
    expect(tariff).toHaveProperty('throttleMs');
  });
});
