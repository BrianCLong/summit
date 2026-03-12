import { describe, expect, it } from 'vitest';
import { personasCommands } from './personas.js';

describe('Personas CLI Command', () => {
  it('should define the personas command', () => {
    expect(personasCommands.name()).toBe('personas');
    expect(personasCommands.description()).toBe('Adversarial persona inspection and analysis commands');
  });

  it('should have inspect subcommand', () => {
    const commands = personasCommands.commands;
    expect(commands.find(c => c.name() === 'inspect')).toBeDefined();
  });
});
