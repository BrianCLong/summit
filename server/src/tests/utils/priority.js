/**
 * Stable sorting utility for plugin hook priorities
 * Ensures deterministic execution order when multiple hooks have the same priority
 */

/**
 * Sort implementations by priority (higher first) with stable tie-breaker by name
 * @param {Array} impls - Array of implementation objects
 * @param {string} key - The hook type key (e.g. 'PRE_ENTITY_CREATE')
 * @returns {Array} - Sorted implementations
 */
function sortByPriorityStable(impls, key) {
  return [...impls].sort((a, b) => {
    const pa = a?.[`${key}Priority`] ?? 0;
    const pb = b?.[`${key}Priority`] ?? 0;
    if (pb !== pa) return pb - pa; // higher priority first
    return String(a?.name ?? '').localeCompare(String(b?.name ?? '')); // stable tiebreak
  });
}

module.exports = {
  sortByPriorityStable,
};
