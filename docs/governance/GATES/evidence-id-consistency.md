# Evidence ID Consistency Gate Failure Guide

This guide helps you resolve failures in the **Evidence ID Consistency** check, which ensures that all Evidence IDs (e.g., `GOV-001`) referenced in documentation are valid, unique, and correctly mapped.

## 1. What this gate checks

*   **Existence:** Every Evidence ID referenced in `docs/governance/**/*.md` must exist in `docs/governance/evidence_catalog.json`.
*   **Uniqueness:** Evidence IDs must not be duplicated across different controls or artifacts.
*   **Format:** IDs must strictly follow the format `GOV-\d+` (or other prefix as defined in policy).
*   **Integrity:** The evidence map must be consistent with the actual artifacts produced.

## 2. How to run locally

Run the consistency check from the root of the repository:

```bash
npm run ci:evidence-id-consistency
```

## 3. Where outputs go (artifacts)

If the check fails, detailed reports are generated:

*   **Machine-readable:** `artifacts/evidence-id-consistency/report.json`
*   **Human-readable:** `artifacts/evidence-id-consistency/report.md`

## 4. How to read the report

Open `report.md` (or the console output) to see a list of violations.
Look for the **Violations** section, which will list each error with:

*   **File:** The file containing the invalid ID.
*   **Line:** The line number.
*   **ID:** The problematic Evidence ID.
*   **Error:** The specific issue (e.g., "Unknown ID", "Duplicate").

## 5. Common failures and fixes

| Error Type | Meaning | Fix |
| :--- | :--- | :--- |
| **Unknown Evidence ID** | The ID used in the doc is not in the catalog. | **Option A:** Fix the typo in the doc.<br>**Option B:** Add the new ID to `docs/governance/evidence_catalog.json` (see Section 7). |
| **Duplicate Evidence ID** | The same ID is defined in multiple places. | **Fix:** Assign a new, unique ID to one of the items. |
| **Invalid Format** | ID does not match `GOV-\d+` regex. | **Fix:** Rename the ID to match the required format. |

## 6. Updating Evidence-IDs correctly

If you are adding a new policy or control:

1.  **Check existing IDs:** Look at `docs/governance/evidence_catalog.json` to find the next available ID.
2.  **Assign ID:** Use the next available ID in your markdown document.
3.  **Register:** Add the ID to the catalog (see below).

## 7. Updating the evidence map (rare)

You typically only need to update the map when introducing a **new** governance control.

1.  Open `docs/governance/evidence_catalog.json`.
2.  Add a new entry for your ID:
    ```json
    {
      "id": "GOV-105",
      "description": "Description of the control",
      "category": "Security"
    }
    ```
3.  Ensure the list remains sorted by ID if required.

## 8. Exceptions (rare; time-bounded)

If you cannot resolve a violation immediately (e.g., legacy doc drift), you may file a temporary exception.

1.  Open `compliance/exceptions/EXCEPTIONS.yml`.
2.  Add an entry under the `evidence-consistency` section (if available) or generic compliance section.
3.  **Must include:**
    *   `id`: The failing Evidence ID.
    *   `reason`: Why it cannot be fixed now.
    *   `expiry`: Date when the exception expires.
    *   `owner`: Your team/username.

## 9. What reviewers expect

*   **Green Check:** The `ci:evidence-id-consistency` job passes in CI.
*   **No Regressions:** You have not removed existing IDs without a valid reason.
*   **Clarity:** New IDs are descriptive and correctly categorized in the catalog.
