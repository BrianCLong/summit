import { describe, it, expect } from 'vitest';
import { InterfaceBuilder } from '../../packages/genui/src/runtime/interface-builder';

describe('Generative Interface Runtime', () => {
  it('Agent response produces structured UI spec', () => {
    const builder = new InterfaceBuilder();
    const ui = builder.build('test-session', [{ type: 'Chart', props: {} }]);
    expect(ui.id).toBe('test-session');
    expect(ui.blocks.length).toBe(1);
    expect(ui.blocks[0].type).toBe('Chart');
  });
});
