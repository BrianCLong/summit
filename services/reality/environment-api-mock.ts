
// services/reality/environment-api-mock.ts

/**
 * Mock API for dynamically changing parameters within a simulated reality.
 */
export class EnvironmentApiMock {
  private realityEngine: any; // Reference to the mock reality engine

  constructor(realityEngine: any) {
    this.realityEngine = realityEngine;
    console.log('EnvironmentApi initialized.');
  }

  /**
   * Simulates changing a parameter in the simulated environment.
   * @param parameterName The name of the parameter to change.
   * @param value The new value for the parameter.
   */
  public async setParameter(parameterName: string, value: any): Promise<void> {
    console.log(`Setting environment parameter '${parameterName}' to '${value}'...`);
    await new Promise(res => setTimeout(res, 30));
    this.realityEngine.updateEnvironment({ [parameterName]: value });
  }

  /**
   * Simulates triggering an event within the simulated environment.
   * @param eventName The name of the event.
   * @param details Event details.
   */
  public async triggerEvent(eventName: string, details: any): Promise<void> {
    console.log(`Triggering event '${eventName}' with details:`, details);
    await new Promise(res => setTimeout(res, 50));
    // In a real system, this would inject an event into the simulation.
  }
}

// Example usage:
// const mockEngine = { updateEnvironment: (env: any) => console.log('Engine updated:', env) };
// const envApi = new EnvironmentApiMock(mockEngine);
// envApi.setParameter('gravity', 9.8);
