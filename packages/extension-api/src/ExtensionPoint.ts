/**
 * Base extension point interface
 */
export interface ExtensionPoint<TInput = any, TOutput = any> {
  id: string;
  type: string;
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Extension point registry
 */
export class ExtensionPointRegistry {
  private extensions = new Map<string, ExtensionPoint[]>();

  /**
   * Register an extension
   */
  register(extension: ExtensionPoint): void {
    const { type } = extension;
    const extensions = this.extensions.get(type) || [];
    extensions.push(extension);
    this.extensions.set(type, extensions);
  }

  /**
   * Unregister an extension
   */
  unregister(extensionId: string): void {
    for (const [type, extensions] of this.extensions.entries()) {
      const filtered = extensions.filter(ext => ext.id !== extensionId);
      this.extensions.set(type, filtered);
    }
  }

  /**
   * Get all extensions of a type
   */
  getExtensions(type: string): ExtensionPoint[] {
    return this.extensions.get(type) || [];
  }

  /**
   * Execute all extensions of a type
   */
  async executeAll<TInput, TOutput>(
    type: string,
    input: TInput
  ): Promise<TOutput[]> {
    const extensions = this.getExtensions(type);
    const results = await Promise.all(
      extensions.map(ext => ext.execute(input))
    );
    return results;
  }

  /**
   * Execute extensions in pipeline (output of one becomes input of next)
   */
  async executePipeline<T>(type: string, initialInput: T): Promise<T> {
    const extensions = this.getExtensions(type);
    let result = initialInput;

    for (const extension of extensions) {
      result = await extension.execute(result);
    }

    return result;
  }
}
