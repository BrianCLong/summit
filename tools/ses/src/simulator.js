"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSimulation = runSimulation;
const analyzer_js_1 = require("./analyzer.js");
const migrator_js_1 = require("./migrator.js");
const rollout_js_1 = require("./rollout.js");
function runSimulation(context) {
    const compatibility = (0, analyzer_js_1.buildCompatibilityMatrix)(context.schema, context.telemetry, context.changes);
    const migrationBundle = (0, migrator_js_1.generateMigrationScripts)(context.schema, context.changes);
    const fixturePreview = context.fixture
        ? (0, migrator_js_1.applyMigrationsToFixture)(context.fixture, migrationBundle)
        : undefined;
    const risk = (0, analyzer_js_1.assessRisk)(compatibility, context.telemetry, context.changes);
    const rollout = (0, rollout_js_1.buildRolloutPlan)(compatibility, risk);
    return {
        compatibility,
        migrationBundle,
        risk,
        rollout,
        fixturePreview,
    };
}
