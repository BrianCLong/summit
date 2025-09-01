import axios from "axios";
class AnalyticsClient {
    constructor(baseURL = process.env.ANALYTICS_URL || "http://localhost:8000") {
        this.failures = 0;
        this.circuitOpen = false;
        this.threshold = 3;
        this.resetMs = 30000;
        this.client = axios.create({ baseURL, timeout: 500 });
    }
    async post(url, data, retries = 2) {
        if (this.circuitOpen) {
            throw new Error("circuit open");
        }
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const res = await this.client.post(url, data);
                this.failures = 0;
                return res.data;
            }
            catch (err) {
                this.failures += 1;
                if (this.failures > this.threshold) {
                    this.tripCircuit();
                }
                if (attempt === retries) {
                    throw err;
                }
            }
        }
        throw new Error("unreachable");
    }
    tripCircuit() {
        this.circuitOpen = true;
        setTimeout(() => {
            this.circuitOpen = false;
            this.failures = 0;
        }, this.resetMs).unref();
    }
    async extractEntities(text) {
        return this.post("/v1/extract", { text });
    }
    async linkSuggestions(nodes, edges) {
        return this.post("/v1/linkify", { nodes, edges });
    }
}
export const analyticsClient = new AnalyticsClient();
export default AnalyticsClient;
//# sourceMappingURL=analyticsClient.js.map