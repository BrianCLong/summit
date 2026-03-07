import { Worker } from "worker_threads";
import * as fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import * as path from "path";
import { ExtensionManifest, ExtensionActivation, ExtensionContext } from "../types.js";
import { ExtensionObservability } from "../observability.js";

export interface SandboxOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface SandboxActivationHandle extends ExtensionActivation {
  dispose: () => Promise<void>;
}

interface WorkerResult {
  exports?: Record<string, any>;
  error?: string;
  hasDispose: boolean;
}

export class SandboxRunner {
  private observability: ExtensionObservability;
  private timeoutMs: number;
  private memoryLimitMb: number;

  constructor(observability: ExtensionObservability, options: SandboxOptions = {}) {
    this.observability = observability;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.memoryLimitMb = options.memoryLimitMb ?? 64;
  }

  async run(
    manifest: ExtensionManifest,
    modulePath: string,
    exportName: string,
    context: ExtensionContext
  ): Promise<SandboxActivationHandle> {
    const start = Date.now();
    const workerFile = this.resolveWorkerFile();
    const workerOptions: any = {
      workerData: {
        manifest,
        modulePath: pathToFileURL(modulePath).toString(),
        exportName,
        context,
        timeoutMs: this.timeoutMs,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: this.memoryLimitMb,
      },
    };

    if (workerFile.endsWith(".ts")) {
      workerOptions.execArgv = ["--loader", "ts-node/esm"];
    }

    const worker = new Worker(workerFile, workerOptions);

    const result = await new Promise<WorkerResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Extension ${manifest.name} exceeded sandbox timeout`));
      }, this.timeoutMs + 100);

      worker.once("message", (message: WorkerResult) => {
        clearTimeout(timer);
        resolve(message);
      });

      worker.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const duration = Date.now() - start;

    if (result.error) {
      this.observability.recordFailure(manifest.name, result.error);
      throw new Error(result.error);
    }

    this.observability.recordActivation(manifest.name, duration);

    return {
      exports: result.exports,
      dispose: async () => {
        if (!result.hasDispose) {
          worker.terminate();
          return;
        }
        worker.postMessage({ type: "dispose" });
        await new Promise<void>((resolve) => {
          worker.once("message", () => resolve());
          setTimeout(() => resolve(), 250);
        });
        worker.terminate();
      },
    };
  }

  private resolveWorkerFile(): string {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const jsPath = path.resolve(dir, "sandbox-worker.js");
    if (fs.existsSync(jsPath)) {
      return jsPath;
    }
    const tsPath = path.resolve(dir, "sandbox-worker.ts");
    return tsPath;
  }
}
