// server/src/ghost/GhostService.ts

import { DigitalPersona, PersonaTask } from './ghost.types';
import { randomUUID } from 'crypto';

/**
 * Service for managing (simulated) autonomous, untraceable digital personas.
 * Project GHOST.
 */
export class GhostService {
  private activePersonas: Map<string, DigitalPersona> = new Map();

  /**
   * Creates a new digital persona.
   * @param persona The DigitalPersona to be created.
   * @returns The created DigitalPersona object.
   */
  async createPersona(persona: Omit<DigitalPersona, 'personaId'>): Promise<DigitalPersona> {
    const personaId = `persona-${randomUUID()}`;
    const newPersona: DigitalPersona = { ...persona, personaId, status: 'active' };
    this.activePersonas.set(personaId, newPersona);
    return newPersona;
  }

  /**
   * Assigns a task to a digital persona.
   * @param task The PersonaTask to be assigned.
   * @returns A confirmation object.
   */
  async assignTask(task: Omit<PersonaTask, 'taskId'>): Promise<{ confirmationId: string; status: string }> {
    const { personaId } = task;
    const persona = this.activePersonas.get(personaId);
    if (!persona || persona.status !== 'active') {
      throw new Error(`Persona ${personaId} is not active.`);
    }
    const confirmationId = `task-${randomUUID()}`;
    return { confirmationId, status: 'assigned' };
  }
}

export const ghostService = new GhostService();
