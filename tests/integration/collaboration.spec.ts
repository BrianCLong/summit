import { OperationalTransform } from '../../server/src/collaboration/operationalTransform';

describe('Operational Transformation', () => {
  test('transform insert/insert', () => {
    const opA = { type: 'insert', position: 0, text: 'A' };
    const opB = { type: 'insert', position: 0, text: 'B' };

    // @ts-ignore
    const [opA_prime, opB_prime] = OperationalTransform.transform(opA, opB);

    expect(opA_prime).toEqual({ type: 'insert', position: 0, text: 'A' });
    expect(opB_prime).toEqual({ type: 'insert', position: 1, text: 'B' });
  });

  test('transform insert/delete', () => {
    const opA = { type: 'insert', position: 5, text: 'hello' };
    const opB = { type: 'delete', position: 0, count: 10 };

    // @ts-ignore
    const [opA_prime, opB_prime] = OperationalTransform.transform(opA, opB);

    // Insert happens inside deleted range -> becomes no-op
    expect(opA_prime.type).toBe('retain');
  });
});
