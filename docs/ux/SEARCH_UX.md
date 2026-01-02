# Search UX Contract

## 1. Search Placement & Behavior
* **Global Search**: Accessible via `Cmd+K` (Mac) or `Ctrl+K` (Windows). Positioned in the top navigation bar or as a floating action button on mobile.
* **Contextual Search**: Placed at the top-left of list views. Accessible via `/` when the list is in focus.
* **Debouncing**: All remote search queries must be debounced by **300ms** to prevent API thrashing.
* **Loading State**: Must show a localized spinner or skeleton loader within the search container, not a full-page blocker.

## 2. Filter UX Rules
* **Visibility**: Active filters must be visible as "chips" or tags above the result list.
* **Resettable**:
    * Each filter chip must have a "close" (x) button.
    * A global "Clear all" button must appear when >1 filter is active.
* **Defaults**: sensible defaults (e.g., "Status: Active") should be applied where appropriate but clearly indicated.
* **Empty State**: When filters result in zero matches, show a specific "No results found" message with a "Clear filters" action.

## 3. URL Synchronization
* **Shareability**: Search queries and active filters must sync to the URL query parameters (e.g., `?q=search+term&status=active&type=entity`).
* **Navigation**: Hitting "Back" in the browser should undo the last filter change.

## 4. Accessibility (A11y)
* **Focus**: Opening search must auto-focus the input. Closing it must return focus to the trigger.
* **ARIA**:
    * Search inputs must have `role="searchbox"`.
    * Autocomplete results must use `role="listbox"` and `aria-selected`.
    * Filter toggles must indicate state (`aria-pressed` or `aria-expanded`).
* **Keyboard**: Full navigation of results via Arrow keys, Enter to select, Esc to close/clear.
