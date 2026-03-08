"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosGraphDriver = void 0;
const harness_js_1 = require("./harness.js");
class ChaosGraphDriver {
    driver;
    targetName;
    constructor(driver, targetName = 'graph-driver') {
        this.driver = driver;
        this.targetName = targetName;
    }
    session(config) {
        const session = this.driver.session(config);
        return new ChaosSession(session, this.targetName);
    }
    close() {
        return this.driver.close();
    }
}
exports.ChaosGraphDriver = ChaosGraphDriver;
class ChaosSession {
    realSession;
    targetName;
    constructor(session, targetName) {
        this.realSession = session;
        this.targetName = targetName;
    }
    async run(query, parameters, config) {
        const harness = harness_js_1.ChaosHarness.getInstance();
        // Latency injection
        await harness.delay(this.targetName);
        // Error injection
        if (harness.shouldFail(this.targetName)) {
            const chaosConfig = harness.getConfig(this.targetName);
            const errorType = chaosConfig.errorType || 'ServiceUnavailable'; // Default neo4j error
            throw new Error(`Chaos injected Neo4j error: ${errorType}`);
        }
        return this.realSession.run(query, parameters, config);
    }
    close() {
        return this.realSession.close();
    }
    beginTransaction(config) {
        return this.realSession.beginTransaction(config);
    }
    readTransaction(work, config) {
        return this.realSession.readTransaction(work, config);
    }
    writeTransaction(work, config) {
        return this.realSession.writeTransaction(work, config);
    }
    executeRead(work, config) {
        return this.realSession.executeRead(work, config);
    }
    executeWrite(work, config) {
        return this.realSession.executeWrite(work, config);
    }
    lastBookmark() {
        return this.realSession.lastBookmark();
    }
    lastBookmarks() {
        return this.realSession.lastBookmarks();
    }
}
