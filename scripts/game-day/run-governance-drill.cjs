const fs = require('fs');
const path = require('path');

// Simple regex based YAML parser since we control the input
function parseYaml(yamlContent) {
    const lines = yamlContent.split('\n');
    const scenarios = [];
    let currentScenario = null;

    for (const line of lines) {
        if (line.trim().startsWith('- id:')) {
            currentScenario = { id: line.split(':')[1].trim() };
            scenarios.push(currentScenario);
        } else if (currentScenario && line.trim().startsWith('name:')) {
            currentScenario.name = line.split('name:')[1].trim().replace(/^"|"$/g, '');
        } else if (currentScenario && line.trim().startsWith('description:')) {
            currentScenario.description = line.split('description:')[1].trim().replace(/^"|"$/g, '');
        } else if (currentScenario && line.trim().startsWith('expected_outcome:')) {
            currentScenario.expected_outcome = line.split('expected_outcome:')[1].trim().replace(/^"|"$/g, '');
        } else if (currentScenario && line.trim().startsWith('expected_reason:')) {
            currentScenario.expected_reason = line.split('expected_reason:')[1].trim().replace(/^"|"$/g, '');
        }
    }
    return { scenarios };
}

function main() {
    const assertionsPath = "validation/governance/assertions.yaml";
    const fixturesDir = "fixtures/governance/";

    let assertionsData;
    try {
        const yamlContent = fs.readFileSync(assertionsPath, 'utf8');
        assertionsData = parseYaml(yamlContent);
    } catch (e) {
        console.error(JSON.stringify({ error: `Failed to load assertions: ${e.message}` }));
        process.exit(1);
    }

    const scenarios = assertionsData.scenarios || [];
    const report = {
        summary: {
            total: scenarios.length,
            passed: 0,
            failed: 0,
        },
        results: []
    };

    let allPassed = true;

    for (const scenario of scenarios) {
        const scenarioId = scenario.id;
        const expectedOutcome = scenario.expected_outcome;

        const fixturePath = path.join(fixturesDir, `${scenarioId}.json`);
        let fixtureData;
        try {
            const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
            fixtureData = JSON.parse(fixtureContent);
        } catch (e) {
            report.results.push({
                scenario_id: scenarioId,
                status: "fail",
                error: `Fixture missing or invalid: ${e.message}`
            });
            report.summary.failed++;
            allPassed = false;
            continue;
        }

        const actualOutcome = fixtureData.actual_outcome;
        const actualReason = fixtureData.actual_reason || "";

        const passed = (actualOutcome === expectedOutcome);
        const status = passed ? "pass" : "fail";

        if (!passed) {
            allPassed = false;
            report.summary.failed++;
        } else {
            report.summary.passed++;
        }

        report.results.push({
            scenario_id: scenarioId,
            name: scenario.name,
            status: status,
            expected_outcome: expectedOutcome,
            actual_outcome: actualOutcome,
            actual_reason: actualReason
        });
    }

    console.log(JSON.stringify(report, null, 2));

    if (!allPassed) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

main();
