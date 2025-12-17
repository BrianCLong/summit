# Example Test Suites

## 1. API Service: `UserService`

**Scenario:** A service managing User profiles.

### Unit Tests (`src/services/__tests__/UserService.test.ts`)
*   **`createUser`**:
    *   *Success:* Should hash password, create user in Repo, emit `UserCreated` event.
    *   *Error:* Should throw if email already exists (mocking Repo to return "exists").
    *   *Error:* Should throw if password is too weak.
*   **`getUser`**:
    *   *Success:* Returns user domain object.
    *   *Error:* Throws `NotFound` if ID invalid.

### Integration Tests (`src/routes/__tests__/users.test.ts`)
*   **Setup:** Spins up TestContainer Postgres.
*   **`POST /users`**:
    *   Sends valid JSON.
    *   Asserts 201 Created.
    *   Asserts DB contains the new record.
    *   Asserts password is NOT stored in plain text.
*   **`GET /users/:id`**:
    *   Seeds a user directly in DB.
    *   Requests the ID.
    *   Asserts 200 OK and correct JSON body.

### Contract Tests
*   **Provider:** Verifies that `GET /users/:id` response matches the OpenAPI `UserSchema` (fields: `id`, `email`, `name`, but NO `password`).

---

## 2. Data Pipeline: `TransactionIngestion`

**Scenario:** A worker reading JSON events from RabbitMQ and saving to Neo4j.

### Unit Tests (`src/ingestion/__tests__/Parser.test.ts`)
*   **`parseEvent`**:
    *   *Success:* Transforms raw JSON `{ "amt": 100, "u_id": "u1" }` to Domain Model `Transaction { amount: 100, userId: "u1" }`.
    *   *Error:* Throws `InvalidSchema` if required fields missing.
    *   *Edge Case:* Handles malformed JSON strings gracefully.

### Integration Tests (`src/workers/__tests__/IngestionWorker.test.ts`)
*   **Setup:** Spins up TestContainer Neo4j and Mock RabbitMQ (or uses in-memory harness).
*   **`processJob`**:
    *   **Input:** Enqueues a valid message.
    *   **Action:** Worker consumes message.
    *   **Assertion:** Queries Neo4j to verify node `(t:Transaction)` exists with correct properties.
*   **Idempotency:**
    *   Enqueues the *same* message ID twice.
    *   Asserts that only **one** node is created in Neo4j (or the second is ignored/merged).

### E2E / Synthetic
*   **Golden Path:**
    *   Inject a "Synthetic Transaction" at the API Gateway.
    *   Wait 5 seconds.
    *   Query the Analytics API to ensure the transaction appears in the aggregate report.
