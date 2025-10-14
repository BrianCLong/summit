import { spawn } from "child_process";
import path from "path";
import pino from "pino";
export class AdversaryAgentService {
    constructor(pythonPath = process.env.PYTHON_PATH || "python", modelsPath = path.join(process.cwd(), "server", "src", "ai", "models")) {
        this.logger = pino({ name: "AdversaryAgentService" });
        this.pythonPath = pythonPath;
        this.modelsPath = modelsPath;
    }
    async generateChain(context, options = {}) {
        return new Promise((resolve, reject) => {
            const script = path.join(this.modelsPath, "adversary_agent.py");
            const args = [
                script,
                "--context",
                JSON.stringify(context),
                "--temperature",
                String(options.temperature ?? 0.7),
                "--persistence",
                String(options.persistence ?? 3),
            ];
            const proc = spawn(this.pythonPath, args);
            let output = "";
            let error = "";
            proc.stdout.on("data", (d) => {
                output += d.toString();
            });
            proc.stderr.on("data", (d) => {
                error += d.toString();
            });
            proc.on("close", (code) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(output);
                        resolve(data);
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                else {
                    reject(new Error(error || "adversary agent failed"));
                }
            });
            proc.on("error", (err) => reject(err));
        });
    }
}
export default AdversaryAgentService;
//# sourceMappingURL=AdversaryAgentService.js.map