import { NormalizedAnswer, EngineRunner } from './types.js';

export class RunnerRegistry {
    private runners: Map<string, EngineRunner> = new Map();

    public register(runner: EngineRunner) {
        this.runners.set(runner.id, runner);
    }

    public getRunner(id: string): EngineRunner | undefined {
        return this.runners.get(id);
    }

    public async runAll(promptId: string, promptText: string): Promise<NormalizedAnswer[]> {
        const promises = Array.from(this.runners.values()).map(async (runner) => {
            try {
                const answer = await runner.run(promptText);
                return {
                    ...answer,
                    promptId,
                    engine: runner.id
                };
            } catch (error) {
                console.error(`Error running ${runner.id} for prompt ${promptId}:`, error);
                return {
                    engine: runner.id,
                    promptId,
                    answerText: "ERROR",
                    citations: [],
                    raw: { error: String(error) }
                };
            }
        });

        return Promise.all(promises);
    }
}
