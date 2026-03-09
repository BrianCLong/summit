export class ContainerRunner {
  runContainer(imageName: string, command: string): Promise<string> {
    // Stub for deterministic container runner
    // eslint-disable-next-line no-console
    console.log(`Running command in container ${imageName}: ${command}`);
    return "Container output";
  }
}
