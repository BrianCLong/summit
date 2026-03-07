import { parentPort, workerData } from "worker_threads";
import { pathToFileURL } from "url";

async function run() {
  const { manifest, modulePath, exportName, context, timeoutMs } = workerData as {
    manifest: any;
    modulePath: string;
    exportName: string;
    context: any;
    timeoutMs: number;
  };

  try {
    const moduleUrl = pathToFileURL(modulePath).href;
    const module = await import(moduleUrl);
    const exported = module[exportName] || module.default;

    if (!exported) {
      throw new Error(`Extension ${manifest.name} does not export ${exportName}`);
    }

    const activationPromise = invoke(exported, context);
    const activation = await withTimeout(activationPromise, timeoutMs);

    parentPort?.postMessage({
      exports: activation?.exports,
      hasDispose: typeof activation?.dispose === "function",
    });

    parentPort?.on("message", async (message: any) => {
      if (message?.type === "dispose" && typeof activation?.dispose === "function") {
        await activation.dispose();
        parentPort?.postMessage({ status: "disposed" });
      }
    });
  } catch (err) {
    parentPort?.postMessage({
      error: err instanceof Error ? err.message : String(err),
      hasDispose: false,
    });
  }
}

async function invoke(exported: any, context: any) {
  if (typeof exported === "function") {
    if (exported.prototype && exported.prototype.constructor === exported) {
      const instance = new exported();
      if (typeof instance.activate === "function") {
        return instance.activate(context);
      }
    }
    return exported(context);
  }

  if (typeof exported.activate === "function") {
    return exported.activate(context);
  }

  throw new Error("Unsupported extension entrypoint type");
}

async function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("Extension activation timed out")), timeout);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutHandle!);
  return result as T;
}

run();
