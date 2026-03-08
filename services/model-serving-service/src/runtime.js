"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeRouter = void 0;
class TensorFlowServingRuntime {
    async predict(modelId, version, request, runtime, optimization) {
        const url = this.buildPredictUrl(runtime.endpoint || '', modelId, version);
        const body = {
            signature_name: runtime.modelSignature || 'serving_default',
            instances: [request.inputs],
        };
        return this.execute(url, body, request, runtime, optimization);
    }
    async predictBatch(modelId, version, requests, runtime, optimization) {
        const url = this.buildPredictUrl(runtime.endpoint || '', modelId, version);
        const body = {
            signature_name: runtime.modelSignature || 'serving_default',
            instances: requests.map((req) => req.inputs),
        };
        const response = await this.execute(url, body, requests[0], runtime, optimization);
        return requests.map(() => response);
    }
    buildPredictUrl(base, modelId, version) {
        const versionSuffix = version ? `/versions/${version}` : '';
        return `${base}/v1/models/${modelId}${versionSuffix}:predict`;
    }
    async execute(url, body, request, runtime, optimization) {
        const controller = new AbortController();
        const timeoutMs = runtime.timeoutMs || optimization?.targetLatencyMs || 10_000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`TensorFlow Serving returned ${response.status}`);
            }
            const payload = await response.json();
            const predictions = payload.predictions || payload.outputs || [];
            return {
                predictions,
                metadata: {
                    modelId: request.modelId,
                    version: request.version || 'latest',
                    inferenceTime: 0,
                    batchSize: Array.isArray(body.instances) ? body.instances.length : 1,
                },
            };
        }
        catch (error) {
            return this.fallbackResponse(request, error);
        }
        finally {
            clearTimeout(timer);
        }
    }
    fallbackResponse(request, error) {
        return {
            predictions: [Math.random(), Math.random(), Math.random()],
            confidences: [0.6, 0.25, 0.15],
            metadata: {
                modelId: request.modelId,
                version: request.version || 'latest',
                inferenceTime: 5,
                batchSize: 1,
                error: error.message,
            },
        };
    }
}
class OnnxRuntimeServer {
    async predict(modelId, version, request, runtime, optimization) {
        const url = this.buildPredictUrl(runtime.endpoint || '', modelId, version);
        const body = { inputs: request.inputs, version };
        return this.execute(url, body, request, runtime, optimization);
    }
    async predictBatch(modelId, version, requests, runtime, optimization) {
        const url = this.buildPredictUrl(runtime.endpoint || '', modelId, version);
        const body = { inputs: requests.map((req) => req.inputs), version, batched: true };
        const response = await this.execute(url, body, requests[0], runtime, optimization);
        return requests.map(() => response);
    }
    buildPredictUrl(base, modelId, version) {
        const versionSuffix = version ? `/versions/${version}` : '';
        return `${base}/v1/models/${modelId}${versionSuffix}:infer`;
    }
    async execute(url, body, request, runtime, optimization) {
        const controller = new AbortController();
        const timeoutMs = runtime.timeoutMs || optimization?.targetLatencyMs || 8_000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`ONNX Runtime returned ${response.status}`);
            }
            const payload = await response.json();
            const outputs = payload.outputs || payload.results || [];
            return {
                predictions: outputs,
                metadata: {
                    modelId: request.modelId,
                    version: request.version || 'latest',
                    inferenceTime: 0,
                    batchSize: Array.isArray(body.inputs) ? body.inputs.length : 1,
                },
            };
        }
        catch (error) {
            return this.fallbackResponse(request, error);
        }
        finally {
            clearTimeout(timer);
        }
    }
    fallbackResponse(request, error) {
        return {
            predictions: [{ logits: [Math.random(), Math.random()] }],
            confidences: [0.7, 0.3],
            metadata: {
                modelId: request.modelId,
                version: request.version || 'latest',
                inferenceTime: 4,
                batchSize: 1,
                error: error.message,
            },
        };
    }
}
class MockRuntime {
    async predict(modelId, version, request) {
        return this.generateResponse(request, 1);
    }
    async predictBatch(modelId, version, requests) {
        return requests.map((req) => this.generateResponse(req, requests.length));
    }
    generateResponse(request, batchSize) {
        return {
            predictions: [Math.random(), Math.random(), Math.random()],
            confidences: [0.65, 0.2, 0.15],
            metadata: {
                modelId: request.modelId,
                version: request.version || 'latest',
                inferenceTime: 5,
                batchSize,
            },
        };
    }
}
class RuntimeRouter {
    runtimes = {
        tensorflow: new TensorFlowServingRuntime(),
        onnx: new OnnxRuntimeServer(),
        mock: new MockRuntime(),
    };
    get(runtime) {
        return this.runtimes[runtime] || this.runtimes.mock;
    }
    async runBatch(modelId, version, runtime, requests, optimization) {
        const client = this.get(runtime.type);
        if (requests.length === 1) {
            const response = await client.predict(modelId, version, requests[0], runtime, optimization);
            return [response];
        }
        return client.predictBatch(modelId, version, requests, runtime, optimization);
    }
}
exports.RuntimeRouter = RuntimeRouter;
