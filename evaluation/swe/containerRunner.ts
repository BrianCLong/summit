export class ContainerRunner {
  async runContainer(imageName: string, command: string): Promise<string> {
    // Stub for deterministic container runner
    console.log(`Running command in container ${imageName}: ${command}`);
    return 'Container output';
  }
}
