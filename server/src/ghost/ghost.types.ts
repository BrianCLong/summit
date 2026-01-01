// server/src/ghost/ghost.types.ts

/**
 * Represents a digital persona.
 */
export interface DigitalPersona {
  personaId: string;
  name: string;
  status: 'active' | 'inactive';
}

/**
 * Represents a task for a digital persona.
 */
export interface PersonaTask {
  taskId: string;
  personaId: string;
  objective: string;
}
