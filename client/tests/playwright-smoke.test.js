"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('EnhancedAIAssistant handles streaming, voice, and idle/export states', async ({ page, }) => {
    // 1. Navigate to the page
    await page.goto('http://localhost:3000/debug-client.html');
    // Wait for the assistant input to be visible
    const assistantInput = page.getByRole('textbox', {
        name: /assistant-input/i,
    });
    await (0, test_1.expect)(assistantInput).toBeVisible();
    // --- Scenario 1: Streaming render and text normalization ---
    const streamingResponse = 'This is a streamed response with some words.';
    const chunks = streamingResponse.split(' '); // Simulate streaming word by word
    // Mock the fetch request that the assistant makes for streaming
    await page.route('**/api/assistant-stream', async (route) => {
        const body = new ReadableStream({
            async start(controller) {
                for (const chunk of chunks) {
                    controller.enqueue(new TextEncoder().encode(chunk + ' '));
                    await page.waitForTimeout(50); // Simulate network delay
                }
                controller.close();
            },
        });
        await route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: body,
        });
    });
    // Type a message to trigger streaming
    await assistantInput.fill('Tell me something streamed');
    await page.getByRole('button', { name: /send/i }).click();
    // Expect the streamed content to appear and normalize
    const messageLog = page.getByTestId('message-log');
    await (0, test_1.expect)(messageLog).toContainText(streamingResponse);
    // --- Scenario 2: Confirm idle transition ---
    const assistantStatus = page.getByRole('status', {
        name: /assistant-status/i,
    });
    await (0, test_1.expect)(assistantStatus).toContainText(/Online/); // Assuming 'Online' is the idle state
    // --- Scenario 3: Trigger voice via a test toggle (UI only) ---
    // Assuming there's a microphone button to toggle voice input
    const micButton = page.getByRole('button', {
        name: /start voice|stop voice/i,
    });
    await (0, test_1.expect)(micButton).toBeVisible();
    await micButton.click(); // Start listening
    // Simulate speech recognition result (Playwright doesn't directly support SR mocking,
    // so we'll use page.evaluate to trigger the mock we set up in Jest)
    // This assumes your Jest SR mock is accessible via window.__srInstances
    await page.evaluate(() => {
        window.__srInstances[0].onresult({
            results: [[{ transcript: 'Voice command test' }]],
        });
        window.__srInstances[0].onend();
    });
    // Expect the voice command to appear in the log
    await (0, test_1.expect)(messageLog).toContainText('Voice command test');
    await (0, test_1.expect)(micButton).toHaveAttribute('aria-label', /start voice/i); // Mic button should be back to 'start'
    // --- Scenario 4: Confirm export button is enabled (assuming it exists) ---
    // This is a placeholder. You'll need to replace 'export-button' with the actual selector
    // for your export button and adjust the expectation based on its behavior.
    const exportButton = page.getByRole('button', { name: /export/i }); // Example selector
    if (await exportButton.isVisible()) {
        // Check if the button exists before asserting
        await (0, test_1.expect)(exportButton).toBeEnabled();
    }
});
