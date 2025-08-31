# Client Testing Playbook

This document summarizes the deterministic testing patterns and helpers used in the client-side test suite, particularly for components like `EnhancedAIAssistant`. These patterns aim to make tests reliable, fast, and easy to understand by eliminating timing-related flakiness and providing clear abstractions for common testing scenarios.

## Core Principles

*   **Determinism:** Tests should produce the same results every time, regardless of execution speed or environment. Avoid reliance on real-world timing or external factors.
*   **Clarity:** Test code should be easy to read and understand, clearly expressing the intent of the test.
*   **Robustness:** Tests should be resilient to minor refactors or changes in implementation details, focusing on observable behavior.

## Key Helpers and Patterns

### 1. Deterministic Transport Mocks (`makeFakeTransport`, `makeStreamingTransport`)

For components that interact with an asynchronous "transport" layer (e.g., fetching data, streaming responses), we use fake transport implementations to control the flow of events precisely.

*   **`makeFakeTransport(script: AssistantEvent[], options?: { mode?: "timer" | "microtask", spacingMs?: number })`**: Creates a transport that emits events based on a predefined `script`.
    *   `mode: "microtask"` (default): Events are emitted immediately within the same microtask, ideal for fast, synchronous-looking tests.
    *   `mode: "timer"`: Events are emitted with a delay, allowing explicit advancement of timers (`jest.advanceTimersByTimeAsync`) for testing time-sensitive logic.
    *   `spacingMs`: When in "timer" mode, specifies the delay between script events.
*   **`makeStreamingTransport(tokens: string[])`**: A convenience helper for creating a transport that streams a sequence of tokens, followed by a "done" event.

**Usage Example:**

```typescript
import { makeFakeTransport, makeStreamingTransport } from '../test-utils/fakes';
import { waitForIdle } from '../test-utils/wait';

test('component streams tokens and settles', async () => {
  const transport = makeStreamingTransport(['Hello', ' ', 'World']);
  render(<MyComponent transport={transport} />);

  // ... interact with component ...

  await waitForIdle(); // Wait for the component to reach an idle state
  // ... assert final state ...
});
```

### 2. Waiting for Idle State (`waitForIdle`)

After a component completes an asynchronous operation (e.g., streaming a response, finishing a calculation), it should transition to an "idle" state. `waitForIdle` ensures your tests wait for this predictable transition, preventing race conditions.

*   **`waitForIdle(timeout = 2000)`**: Waits until the component's status element (identified by `role="status"` and `name=/assistant-status/i`) contains the text "idle" (case-insensitive).

**Usage Example:**

```typescript
import { waitForIdle } from '../test-utils/wait';

test('async operation completes and component becomes idle', async () => {
  // ... trigger async operation ...
  await waitForIdle();
  expect(screen.getByRole('status', { name: /assistant-status/i })).toHaveTextContent(/Online/); // Or whatever your "idle" status text is
});
```

### 3. Deterministic Speech Recognition Mock (`emitSpeechResult`)

For components integrating with `SpeechRecognition`, we use a mock that allows tests to manually trigger speech results, eliminating reliance on real browser APIs or unreliable timeouts.

*   **`emitSpeechResult(transcript: string, idx?: number)`**: Manually triggers a `SpeechRecognitionResult` event with the given `transcript`.
    *   `idx`: Optional. Specifies which `SpeechRecognition` instance to target if multiple exist. Defaults to the last created instance.

**Usage Example:**

```typescript
import { emitSpeechResult } from '../test-utils/voice';

test('voice input processes transcript', async () => {
  // ... activate voice input in component ...
  emitSpeechResult('Hello, how are you?');
  // ... assert component's reaction to the transcript ...
});
```

### 4. Robust Streaming Fetch Mock (`installStreamingFetchMock`)

For components that use the `fetch` API for streaming responses, this mock provides a controlled environment, supporting both `response.body.getReader()` and `await response.text()` code paths.

*   **`installStreamingFetchMock(chunks: string[])`**: Installs a global `fetch` mock that streams the provided `chunks`.

**Usage Example:**

```typescript
import { installStreamingFetchMock } from '../test-utils/fetch';

test('component handles streaming fetch response', async () => {
  installStreamingFetchMock(['data chunk 1', 'data chunk 2', 'final data']);
  // ... trigger fetch in component ...
  // ... assert component's state as data streams or after completion ...
});
```

### 5. Guarding `userEvent` with `withUser`

To prevent accidental mixing of fake timers with `userEvent` (which can lead to hard-to-debug issues), all `userEvent` interactions should be wrapped in the `withUser` helper. This helper automatically switches to real timers for the duration of the `userEvent` interaction if fake timers are active.

*   **`withUser(fn: (u: ReturnType<typeof userEvent.setup>) => Promise<T> | T)`**: Executes the provided function `fn` with a `userEvent` instance. Ensures real timers are used during the interaction.

**Usage Example:**

```typescript
import { withUser } from '../../test-utils/user'; // Adjust path as needed

test('user interaction triggers expected behavior', async () => {
  const input = screen.getByRole('textbox');
  await withUser(async (u) => {
    await u.type(input, 'My message');
    await u.click(screen.getByRole('button', { name: /send/i }));
  });
  // ... assert outcomes ...
});
```

### 6. Robust Content Assertions (`expectTextAcrossElements`, `expectLastAssistantMessageToContain`)

These helpers provide more resilient ways to assert text content in the DOM, handling variations in whitespace, line breaks, and element structures.

*   **`normalizeText(s: string)`**: Internal utility to normalize text by collapsing whitespace, removing non-breaking spaces and zero-width spaces.
*   **`expectTextAcrossElements(container: HTMLElement, pattern: RegExp | string, timeout = 2000)`**: Waits until the aggregate text content of a `container` element matches a given `pattern` (RegExp or string).
*   **`expectLastAssistantMessageToContain(pattern: RegExp | string, timeout = 2000)`**: A specialized helper to assert content within the last assistant message displayed in the message log.

**Usage Example:**

```typescript
import { expectTextAcrossElements, expectLastAssistantMessageToContain } from '../test-utils/text';

test('message content is correct', async () => {
  const log = screen.getByTestId('message-log');
  await expectTextAcrossElements(log, /Expected message content/i);
  await expectLastAssistantMessageToContain('Final response text');
});
```

### 7. Console Error Guardrail

Tests are configured to fail if any `console.error` calls occur unexpectedly. This helps catch React warnings, accessibility issues, or other runtime errors that might otherwise go unnoticed.

*   **Configuration:** Implemented in `jest.setup.ts` using `jest.spyOn(console, "error")`.

### 8. CI Coverage Gates and JUnit Reporting

The CI pipeline (`.github/workflows/ci-client-tests.yml`) enforces code coverage thresholds and publishes JUnit XML reports, providing clear feedback on test status and code quality.

*   **Coverage:** Configured in `client/jest.config.js` with `coverageThreshold`.
*   **JUnit:** Configured in `client/jest.config.js` with `jest-junit` reporter, and uploaded as an artifact in CI.

### 9. Property-Based Fuzz Testing (Fast-Check)

For critical logic like token chunking, property-based testing with `fast-check` is used to explore a wide range of inputs automatically, ensuring robustness against edge cases that might be missed by hand-written examples.

*   **`fc.assert(fc.asyncProperty(...))`**: Used to define properties that should hold true for various generated inputs.

---
