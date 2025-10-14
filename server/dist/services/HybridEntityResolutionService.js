import path from "path";
import { PythonShell } from "python-shell";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
const log = pino({ name: "HybridEntityResolutionService" });
export async function resolveEntities(a, b) {
    const traceId = uuidv4();
    const script = path.join(process.cwd(), "ml", "er", "api.py");
    const result = await PythonShell.run(script, {
        args: [a, b],
        pythonOptions: ["-u"],
    });
    const parsed = JSON.parse(result[0]);
    log.info({ traceId, features: parsed.explanation }, "er_match");
    return { ...parsed, traceId };
}
//# sourceMappingURL=HybridEntityResolutionService.js.map