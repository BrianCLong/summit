import { describe, it, expect, beforeEach } from "vitest";
import { getChaosController, resetChaosController, ChaosController } from "intelgraph-server/src/chaos/ChaosController.js";
import { ChaosInjector } from "./index.js";

describe("Chaos Mode Integration", () => {
    beforeEach(() => {
        resetChaosController();
    });

    it("should verify chaos mode is registered and can be configured system-wide", async () => {
        const controller = new ChaosController('development', { enabled: true, allowedEnvironments: ['development'] });
        controller.enable();

        expect(controller.getStats().data?.isEnabled).toBe(true);

        const injector = new ChaosInjector({ probability: 1, active: true });
        expect(injector.inject("data")).toBe("data [POISONED]");

        const experimentData = controller.createExperiment({
           name: "test injection",
           type: "failure",
           targets: ["/api/test"],
           probability: 1,
           config: { statusCode: 500, message: "chaos", errorType: "test" }
        });

        expect(experimentData.data).toBeDefined();
        if (experimentData.data) {
           const experiment = experimentData.data;
           expect(experiment.type).toBe("failure");
           expect(experiment.probability).toBe(1);
        }
    });
});
