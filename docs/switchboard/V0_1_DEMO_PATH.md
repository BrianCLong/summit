# v0.1 Demo Path: The Consumer Wedge

**Status**: v0.1 (Draft)
**Owner**: Jules
**Goal**: Show "Provable + Governed" intelligence in < 5 minutes.

## 1. The Narrative
"You are an investigator checking if a domain is spoofing your brand. You need to search the web, but you must prove you followed policy."

## 2. Happy Path (User Journey)

### Step 1: Onboard & Connect
*   **User Action**: `summit connect brave-search`
*   **System**: Spins up `mcp-server-brave` in a sandbox.
*   **UX**: "✅ Connected to Brave Search (Policy: Read-Only, No PII)"

### Step 2: Run a Governed Task
*   **User Action**: `summit run "Check if summlt.io is spoofing us"`
*   **System**:
    1.  **Plan**: Selects `search_web`.
    2.  **Policy**: Checks `allow_search`. Result: `ALLOW`.
    3.  **Execute**: Calls Brave.
    4.  **Receipt**: Generates `rcpt-123`.

### Step 3: View the Evidence
*   **User Action**: `summit receipt rcpt-123`
*   **UX**: Shows a JSON card with:
    *   **Intent**: "Check spoofing"
    *   **Tool**: "Brave Search"
    *   **Policy Decision**: "✅ Authorized by Analyst Policy"
    *   **Result Hash**: `sha256:8f4...`

### Step 4: The "Aha!" Moment (Policy Veto)
*   **User Action**: `summit run "Scan ports on summlt.io"`
*   **System**:
    1.  **Plan**: Selects `nmap_scan`.
    2.  **Policy**: Checks `allow_port_scan`. Result: `DENY`.
*   **UX**: "❌ **Policy Blocked**: Port scanning is not allowed for your tier. (Trace ID: `trace-999`)"

### Step 5: Export Evidence
*   **User Action**: `summit export --format=pdf`
*   **System**: Bundles the receipt + policy proof into a PDF.
*   **UX**: "📄 Downloaded `evidence-bundle.pdf`. Contains 1 verified action and 1 prevented violation."

## 3. Mocked vs. Real

| Component | Status | Notes |
| :--- | :--- | :--- |
| **CLI / SDK** | **Real** | Functional `summit` command. |
| **Policy Engine** | **Real** | OPA running in-process or sidecar. |
| **Brave Search** | **Real** | Connects to actual Brave API (or mocked if no key). |
| **Port Scanner** | **Mocked** | We don't need real nmap; just a tool definition that triggers the deny. |
| **Receipt Store** | **Real** | SQLite database storing JSON blobs. |

## 4. UX Copy Snippets

*   **Success**: "Verified. Receipt #`rcpt-xyz` logged to immutable ledger."
*   **Failure**: "Action prevented by `security-policy-v1`. See trace for details."
*   **Trust**: "Summit: Intelligence you can prove."
